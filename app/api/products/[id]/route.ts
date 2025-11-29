// app/api/products/[id]/route.ts - FULLY OPTIMIZED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'

// ===================================
// VALIDATION
// ===================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const validateProductUpdate = (data: any) => {
  const errors: string[] = []

  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || data.name.length < 3 || data.name.length > 200) {
      errors.push('Name must be between 3 and 200 characters')
    }
  }

  if (data.description !== undefined) {
    if (typeof data.description !== 'string' || data.description.length < 10) {
      errors.push('Description must be at least 10 characters')
    }
  }

  if (data.price !== undefined) {
    const price = parseFloat(data.price)
    if (isNaN(price) || price < 0) {
      errors.push('Price must be a valid positive number')
    }
  }

  if (data.comparePrice !== undefined && data.comparePrice !== null) {
    const comparePrice = parseFloat(data.comparePrice)
    if (isNaN(comparePrice) || comparePrice < 0) {
      errors.push('Compare price must be a valid positive number')
    }
  }

  if (data.stock !== undefined) {
    const stock = parseInt(data.stock)
    if (isNaN(stock) || stock < 0) {
      errors.push('Stock must be a non-negative integer')
    }
  }

  if (data.weight !== undefined && data.weight !== null) {
    const weight = parseFloat(data.weight)
    if (isNaN(weight) || weight < 0) {
      errors.push('Weight must be a positive number')
    }
  }

  if (data.sku && typeof data.sku !== 'string') {
    errors.push('SKU must be a string')
  } else if (data.sku && !/^[A-Z0-9-_]+$/i.test(data.sku)) {
    errors.push('SKU can only contain letters, numbers, hyphens, and underscores')
  }

  if (data.slug && typeof data.slug !== 'string') {
    errors.push('Slug must be a string')
  } else if (data.slug && !/^[a-z0-9-]+$/.test(data.slug)) {
    errors.push('Slug can only contain lowercase letters, numbers, and hyphens')
  }

  if (data.images && !Array.isArray(data.images)) {
    errors.push('Images must be an array')
  }

  if (data.tags && !Array.isArray(data.tags)) {
    errors.push('Tags must be an array')
  }

  return errors
}

// ===================================
// GET /api/products/[id] - OPTIMIZED
// ===================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = request.nextUrl
    const includeInactive = searchParams.get('includeInactive') === 'true'

    if (!id || id.length < 10) {
      return NextResponse.json(
        { error: 'Invalid product ID format' },
        { status: 400 }
      )
    }

    // ✅ OPTIMIZED: Single query with proper select
    const product = await prisma.product.findUnique({
      where: { 
        id,
        ...(includeInactive ? {} : { deletedAt: null })
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        comparePrice: true,
        stock: true,
        sku: true,
        images: true,
        tags: true,
        specifications: true,
        weight: true,
        dimensions: true,
        metaTitle: true,
        metaDescription: true,
        isActive: true,
        isFeatured: true,
        viewCount: true,
        salesCount: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
            image: true,
            parent: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        },
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            website: true,
            description: true
          }
        },
        variants: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            comparePrice: true,
            stock: true,
            attributes: true,
            images: true,
            isActive: true,
            createdAt: true,
            _count: {
              select: {
                orderItems: true,
                cartItems: true
              }
            }
          }
        },
        reviews: {
          where: includeInactive ? {} : { isVerified: true },
          select: {
            id: true,
            rating: true,
            title: true,
            comment: true,
            images: true,
            isVerified: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        inventoryLogs: {
          select: {
            id: true,
            changeAmount: true,
            newStock: true,
            reason: true,
            notes: true,
            createdAt: true,
            changedByUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            variant: {
              select: {
                id: true,
                name: true,
                sku: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        _count: {
          select: {
            reviews: true,
            orderItems: true,
            variants: true,
            inventoryLogs: true,
            wishlistItems: true,
            cartItems: true
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // ✅ OPTIMIZED: Calculate stats efficiently
    const averageRating = product.reviews.length > 0
      ? product.reviews.reduce((acc, review) => acc + review.rating, 0) / product.reviews.length
      : 0

    const ratingDistribution = {
      5: product.reviews.filter(r => r.rating === 5).length,
      4: product.reviews.filter(r => r.rating === 4).length,
      3: product.reviews.filter(r => r.rating === 3).length,
      2: product.reviews.filter(r => r.rating === 2).length,
      1: product.reviews.filter(r => r.rating === 1).length,
    }

    const totalVariantStock = product.variants.reduce((sum, v) => sum + v.stock, 0)

    const lowStockThreshold = 10
    const inventoryHealth = {
      status: product.stock === 0 
        ? 'out_of_stock' 
        : product.stock <= lowStockThreshold 
        ? 'low_stock' 
        : 'in_stock',
      baseStock: product.stock,
      variantStock: totalVariantStock,
      totalStock: product.stock + totalVariantStock,
      lowStockThreshold,
      recentChanges: product.inventoryLogs.slice(0, 5)
    }

    // ✅ NON-BLOCKING: Increment view count
    prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    }).catch(err => console.error('Failed to increment view count:', err))

    const headers = new Headers()
    headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')

    return NextResponse.json({
      ...product,
      averageRating: parseFloat(averageRating.toFixed(1)),
      ratingDistribution,
      inventoryHealth,
      analytics: {
        totalReviews: product._count.reviews,
        totalOrders: product._count.orderItems,
        totalVariants: product._count.variants,
        wishlistedBy: product._count.wishlistItems,
        inCarts: product._count.cartItems,
        viewCount: product.viewCount,
        salesCount: product.salesCount
      }
    }, { headers })
  } catch (error) {
    console.error('Error fetching product:', error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: 'Database error occurred', code: error.code },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch product',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}

// ===================================
// PUT /api/products/[id] - FULLY OPTIMIZED
// ===================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
        
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { id } = await params

    if (!id || id.length < 10) {
      return NextResponse.json(
        { error: 'Invalid product ID format' },
        { status: 400 }
      )
    }

    const data = await request.json()

    const validationErrors = validateProductUpdate(data)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validationErrors },
        { status: 400 }
      )
    }

    // ✅ CRITICAL: All checks OUTSIDE transaction
    const currentProduct = await prisma.product.findUnique({
      where: { id },
      select: { 
        stock: true,
        name: true,
        slug: true,
        sku: true,
        deletedAt: true,
        isActive: true
      }
    })

    if (!currentProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    if (currentProduct.deletedAt) {
      return NextResponse.json(
        { error: 'Cannot update deleted product' },
        { status: 400 }
      )
    }

    // ✅ Check slug uniqueness
    if (data.slug && data.slug !== currentProduct.slug) {
      const existingSlug = await prisma.product.findFirst({
        where: {
          slug: data.slug,
          id: { not: id },
          deletedAt: null
        }
      })

      if (existingSlug) {
        return NextResponse.json(
          { error: 'A product with this slug already exists' },
          { status: 400 }
        )
      }
    }

    // ✅ Check SKU uniqueness
    if (data.sku && data.sku !== currentProduct.sku) {
      const existingSku = await prisma.product.findFirst({
        where: {
          sku: data.sku,
          id: { not: id },
          deletedAt: null
        }
      })

      if (existingSku) {
        return NextResponse.json(
          { error: 'A product with this SKU already exists' },
          { status: 400 }
        )
      }
    }

    // ✅ Validate foreign keys
    if (data.categoryId !== undefined) {
      if (data.categoryId) {
        const categoryExists = await prisma.category.findUnique({
          where: { id: data.categoryId },
          select: { id: true }
        })
        if (!categoryExists) {
          return NextResponse.json(
            { error: 'Invalid category ID provided' },
            { status: 400 }
          )
        }
      }
    }

    if (data.brandId !== undefined) {
      if (data.brandId) {
        const brandExists = await prisma.brand.findUnique({
          where: { id: data.brandId },
          select: { id: true }
        })
        if (!brandExists) {
          return NextResponse.json(
            { error: 'Invalid brand ID provided' },
            { status: 400 }
          )
        }
      }
    }

    // Calculate stock changes
    const newStock = data.stock !== undefined ? parseInt(data.stock) : currentProduct.stock
    const stockChange = newStock - currentProduct.stock
    const hasStockChange = stockChange !== 0

    // ✅ OPTIMIZED: Prepare all data BEFORE transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      ...(data.name && { name: data.name.trim() }),
      ...(data.slug && { slug: data.slug }),
      ...(data.description && { description: data.description.trim() }),
      ...(data.price !== undefined && { price: parseFloat(data.price) }),
      ...(data.comparePrice !== undefined && { 
        comparePrice: data.comparePrice ? parseFloat(data.comparePrice) : null 
      }),
      ...(data.stock !== undefined && { stock: newStock }),
      ...(data.sku !== undefined && { sku: data.sku || null }),
      ...(data.images && { images: data.images }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId || null }),
      ...(data.brandId !== undefined && { brandId: data.brandId || null }),
      ...(data.tags && { tags: data.tags }),
      ...(data.specifications !== undefined && { specifications: data.specifications }),
      ...(data.weight !== undefined && { 
        weight: data.weight ? parseFloat(data.weight) : null 
      }),
      ...(data.dimensions !== undefined && { dimensions: data.dimensions }),
      ...(data.metaTitle !== undefined && { metaTitle: data.metaTitle }),
      ...(data.metaDescription !== undefined && { metaDescription: data.metaDescription }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
      updatedAt: new Date()
    }

    // ✅ OPTIMIZED: Fast transaction with optimistic locking
    const result = await prisma.$transaction(
      async (tx) => {
        // Update with optimistic lock
        const updatedProduct = await tx.product.update({
          where: { 
            id,
            stock: currentProduct.stock // Optimistic lock
          },
          data: updateData,
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            price: true,
            comparePrice: true,
            stock: true,
            sku: true,
            images: true,
            tags: true,
            isActive: true,
            isFeatured: true,
            viewCount: true,
            salesCount: true,
            createdAt: true,
            updatedAt: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            },
            brand: {
              select: {
                id: true,
                name: true,
                slug: true,
                logo: true
              }
            },
            variants: {
              where: { isActive: true },
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                stock: true
              }
            },
            _count: {
              select: {
                reviews: true,
                orderItems: true,
                variants: true
              }
            }
          }
        })

        // Create inventory log only if stock changed
        if (hasStockChange) {
          await tx.inventoryLog.create({
            data: {
              productId: id,
              changeAmount: stockChange,
              newStock: newStock,
              reason: data.inventoryReason || 'ADJUSTMENT_MANUAL',
              notes: data.inventoryNotes || 
                `Stock updated from ${currentProduct.stock} to ${newStock} via product edit`,
              changedByUserId: session.user.id!
            }
          })
        }

        return updatedProduct
      },
      {
        maxWait: 5000,
        timeout: 10000,
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
      }
    )

    return NextResponse.json({
      ...result,
      message: 'Product updated successfully',
      stockChanged: hasStockChange,
      stockChange: hasStockChange ? stockChange : undefined
    })
  } catch (error) {
    console.error('Error updating product:', error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const field = (error.meta?.target as string[])?.[0] || 'field'
        return NextResponse.json(
          { error: `A product with this ${field} already exists` },
          { status: 400 }
        )
      }
      
      if (error.code === 'P2003') {
        return NextResponse.json(
          { error: 'Invalid category or brand ID provided' },
          { status: 400 }
        )
      }

      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Product not found or stock was modified by another request' },
          { status: 409 }
        )
      }

      if (error.code === 'P2028') {
        return NextResponse.json(
          { error: 'Transaction timeout. Please try again.' },
          { status: 408 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to update product',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}

// ===================================
// DELETE /api/products/[id] - ENHANCED
// ===================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
        
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { id } = await params

    if (!id || id.length < 10) {
      return NextResponse.json(
        { error: 'Invalid product ID format' },
        { status: 400 }
      )
    }

    // ✅ Check product status OUTSIDE transaction
    const product = await prisma.product.findUnique({
      where: { id },
      select: { 
        id: true, 
        name: true, 
        deletedAt: true,
        _count: {
          select: {
            orderItems: true,
            cartItems: true
          }
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.deletedAt) {
      return NextResponse.json(
        { error: 'Product is already deleted' },
        { status: 400 }
      )
    }

    // ✅ OPTIMIZED: Single update
    await prisma.product.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    })

    return NextResponse.json({ 
      message: 'Product deleted successfully',
      productName: product.name,
      warnings: {
        hadActiveOrders: product._count.orderItems > 0,
        wasInCarts: product._count.cartItems > 0
      }
    })
  } catch (error) {
    console.error('Error deleting product:', error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to delete product',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}