/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/products/[id]/variants/route.ts - Enhanced variant management
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'
import { Prisma } from '@prisma/client'

// GET /api/products/[id]/variants - Get all variants for a product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: any = {
      productId: params.id
    }

    if (!includeInactive) {
      where.isActive = true
    }

    const variants = await prisma.productVariant.findMany({
      where,
      include: {
        product: {
          select: {
            name: true,
            slug: true,
            price: true,
            images: true
          }
        },
        inventoryLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            changedByUser: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            orderItems: true,
            cartItems: true,
            inventoryLogs: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Calculate statistics
    const totalStock = variants.reduce((sum, v) => sum + v.stock, 0)
    const lowStockCount = variants.filter(v => v.stock > 0 && v.stock <= 10).length
    const outOfStockCount = variants.filter(v => v.stock === 0).length

    return NextResponse.json({
      variants,
      statistics: {
        total: variants.length,
        active: variants.filter(v => v.isActive).length,
        totalStock,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount
      }
    })
  } catch (error) {
    console.error('Error fetching variants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch variants' },
      { status: 500 }
    )
  }
}

// POST /api/products/[id]/variants - Create new variant
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
        
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const data = await request.json()

    // Validate required fields
    if (!data.sku || !data.name) {
      return NextResponse.json(
        { error: 'SKU and name are required' },
        { status: 400 }
      )
    }

    // Check if SKU already exists
    const existingVariant = await prisma.productVariant.findUnique({
      where: { sku: data.sku }
    })

    if (existingVariant) {
      return NextResponse.json(
        { error: 'A variant with this SKU already exists' },
        { status: 400 }
      )
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: params.id }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const initialStock = parseInt(data.stock) || 0

    const result = await prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.create({
        data: {
          productId: params.id,
          sku: data.sku,
          name: data.name,
          price: data.price ? parseFloat(data.price) : null,
          comparePrice: data.comparePrice ? parseFloat(data.comparePrice) : null,
          stock: initialStock,
          attributes: data.attributes || {},
          images: data.images || [],
          isActive: data.isActive !== false
        },
        include: {
          product: {
            include: {
              category: true,
              brand: true
            }
          }
        }
      })

      // Create initial inventory log if stock > 0
      if (initialStock > 0) {
        await tx.inventoryLog.create({
          data: {
            productId: params.id,
            variantId: variant.id,
            changeAmount: initialStock,
            newStock: initialStock,
            reason: 'RECEIVING',
            notes: data.inventoryNotes || `Initial stock for variant: ${data.name}`,
            changedByUserId: session.user.id
          }
        })
      }

      return variant
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating variant:', error)
    
    // Handle unique constraint violations
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A variant with this SKU already exists' },
        { status: 400 }
      )
    }
  }
    
    return NextResponse.json(
      { error: 'Failed to create variant' },
      { status: 500 }
    )
  }
}