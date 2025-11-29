// app/api/upload/route.ts - ENHANCED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import sharp from 'sharp'

// Allowed file types
const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
}

// Max file sizes
const MAX_SIZES = {
  product: 10 * 1024 * 1024, // 10MB for product images
  category: 5 * 1024 * 1024,  // 5MB for category images
  brand: 2 * 1024 * 1024,     // 2MB for brand logos
  default: 5 * 1024 * 1024    // 5MB default
}

/**
 * POST /api/upload - Upload and optimize images
 * 
 * Query Parameters:
 * - type: 'product' | 'category' | 'brand' | 'other' (default: 'product')
 * - optimize: 'true' | 'false' (default: 'true')
 * - width: number (optional, for resizing)
 * - height: number (optional, for resizing)
 * - quality: number (1-100, default: 80)
 * 
 * Form Data:
 * - file: File (required)
 * - alt: string (optional, for accessibility)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can upload
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Admin access required' 
      }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = request.nextUrl
    const uploadType = searchParams.get('type') || 'product'
    const shouldOptimize = searchParams.get('optimize') !== 'false'
    const targetWidth = searchParams.get('width') ? parseInt(searchParams.get('width')!) : null
    const targetHeight = searchParams.get('height') ? parseInt(searchParams.get('height')!) : null
    const quality = Math.min(100, Math.max(1, parseInt(searchParams.get('quality') || '80')))

    // Validate upload type
    if (!['product', 'category', 'brand', 'other'].includes(uploadType)) {
      return NextResponse.json({ 
        error: 'Invalid upload type. Must be: product, category, brand, or other' 
      }, { status: 400 })
    }

    // Get form data
    const formData = await request.formData()
    const file: File | null = formData.get('file') as unknown as File
    const altText = formData.get('alt') as string || ''

    if (!file) {
      return NextResponse.json({ 
        error: 'No file received' 
      }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES]) {
      return NextResponse.json({ 
        error: `Invalid file type: ${file.type}. Allowed types: JPEG, PNG, WebP, GIF` 
      }, { status: 400 })
    }

    // Validate file size based on upload type
    const maxSize = MAX_SIZES[uploadType as keyof typeof MAX_SIZES] || MAX_SIZES.default
    if (file.size > maxSize) {
      const maxMB = (maxSize / (1024 * 1024)).toFixed(1)
      return NextResponse.json({ 
        error: `File size too large. Maximum ${maxMB}MB allowed for ${uploadType} images.` 
      }, { status: 400 })
    }

    // Read file buffer
    const bytes = await file.arrayBuffer()
    let buffer = Buffer.from(bytes)

    // Get file extension
    const extension = ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES]

    // Optimize image if requested
    let optimizedSize = file.size
    let dimensions = { width: 0, height: 0 }

    if (shouldOptimize && extension !== 'gif') {
      try {
        let sharpInstance = sharp(buffer)

        // Get original dimensions
        const metadata = await sharpInstance.metadata()
        dimensions = {
          width: metadata.width || 0,
          height: metadata.height || 0
        }

        // Resize if dimensions specified
        if (targetWidth || targetHeight) {
          sharpInstance = sharpInstance.resize(targetWidth, targetHeight, {
            fit: 'inside',
            withoutEnlargement: true
          })
        } else {
          // Default max dimensions based on type
          const maxDimensions = {
            product: { width: 2000, height: 2000 },
            category: { width: 1200, height: 1200 },
            brand: { width: 500, height: 500 },
            other: { width: 1920, height: 1920 }
          }
          
          const max = maxDimensions[uploadType as keyof typeof maxDimensions]
          sharpInstance = sharpInstance.resize(max.width, max.height, {
            fit: 'inside',
            withoutEnlargement: true
          })
        }

        // Convert and optimize based on type
        if (extension === 'png') {
          buffer = Buffer.from(await sharpInstance
            .png({ quality, compressionLevel: 9 })
            .toBuffer())
        } else if (extension === 'webp') {
          buffer = Buffer.from(await sharpInstance
            .webp({ quality })
            .toBuffer())
        } else {
          buffer = Buffer.from(await sharpInstance
            .jpeg({ quality, mozjpeg: true })
            .toBuffer())
        }

        optimizedSize = buffer.length

      } catch (error) {
        console.error('Error optimizing image:', error)
        // Continue with original buffer if optimization fails
      }
    }

    // Create upload directory structure
    const uploadDir = join(process.cwd(), 'public', 'uploads', `${uploadType}s`)
    const yearMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const fullUploadDir = join(uploadDir, yearMonth)

    // Create directories if they don't exist
    if (!existsSync(fullUploadDir)) {
      await mkdir(fullUploadDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const sanitizedName = file.name
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[^a-zA-Z0-9]/g, '_') // Replace special chars
      .substring(0, 30) // Limit length
      .toLowerCase()
    
    const fileName = `${timestamp}_${randomSuffix}_${sanitizedName}.${extension}`
    const filePath = join(fullUploadDir, fileName)

    // Write the file
    await writeFile(filePath, buffer)

    // Generate public URL
    const publicUrl = `/uploads/${uploadType}s/${yearMonth}/${fileName}`

    // Calculate compression ratio
    const compressionRatio = file.size > 0 
      ? ((1 - optimizedSize / file.size) * 100).toFixed(1) 
      : '0'

    return NextResponse.json({ 
      success: true,
      url: publicUrl,
      filename: fileName,
      alt: altText || `${uploadType} image`,
      originalSize: file.size,
      optimizedSize: optimizedSize,
      compressionRatio: `${compressionRatio}%`,
      dimensions,
      type: file.type,
      uploadType,
      uploadedBy: session.user.id,
      uploadedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to upload file',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 })
  }
}

/**
 * DELETE /api/upload - Delete an uploaded file
 * 
 * Query Parameters:
 * - url: string (required) - The public URL of the file to delete
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ 
        error: 'Admin access required' 
      }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const fileUrl = searchParams.get('url')

    if (!fileUrl) {
      return NextResponse.json({ 
        error: 'File URL is required' 
      }, { status: 400 })
    }

    // Validate URL format
    if (!fileUrl.startsWith('/uploads/')) {
      return NextResponse.json({ 
        error: 'Invalid file URL' 
      }, { status: 400 })
    }

    // Convert URL to file path
    const filePath = join(process.cwd(), 'public', fileUrl)

    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json({ 
        error: 'File not found' 
      }, { status: 404 })
    }

    // Delete the file
    await unlink(filePath)

    return NextResponse.json({ 
      success: true,
      message: 'File deleted successfully',
      url: fileUrl
    })

  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to delete file',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 })
  }
}