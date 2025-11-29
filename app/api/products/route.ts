/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/products/route.ts - FULLY OPTIMIZED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'

// ===================================
// TYPES & VALIDATION
// ===================================

interface ProductInput {
  name: string
  description: string
  price: number | string
  comparePrice?: number | string | null
  stock?: number | string
  sku?: string
  images?: string[]
  tags?: string[]
  categoryId?: string
  brandId?: string
  specifications?: any
  weight?: number | string | null
  dimensions?: any
  metaTitle?: string
  metaDescription?: string
  isActive?: boolean
  isFeatured?: boolean
  inventoryNotes?: string
  slug?: string
}

const validateProductInput = (data: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!data.name || typeof data.name !== 'string') {
    errors.push('Name is required and must be a string')
  } else if (data.name.length < 3 || data.name.length > 200) {
    errors.push('Name must be between 3 and 200 characters')
  }

  if (!data.description || typeof data.description !== 'string') {
    errors.push('Description is required and must be a string')
  } else if (data.description.length < 10) {
    errors.push('Description must be at least 10 characters')
  }

  if (data.price === undefined || data.price === null) {
    errors.push('Price is required')
  } else if (isNaN(parseFloat(String(data.price)))) {
    errors.push('Price must be a valid number')
  } else if (parseFloat(String(data.price)) < 0) {
    errors.push('Price cannot be negative')
  }

  if (data.comparePrice !== undefined && data.comparePrice !== null) {
    const comparePrice = parseFloat(String(data.comparePrice))
    if (isNaN(comparePrice) || comparePrice < 0) {
      errors.push('Compare price must be a valid positive number')
    }
  }

  if (data.stock !== undefined) {
    const stock = parseInt(String(data.stock))
    if (isNaN(stock) || stock < 0) {
      errors.push('Stock must be a non-negative integer')
    }
  }

  if (data.weight !== undefined && data.weight !== null) {
    const weight = parseFloat(String(data.weight))
    if (isNaN(weight) || weight < 0) {
      errors.push('Weight must be a positive number')
    }
  }

  if (data.images && !Array.isArray(data.images)) {
    errors.push('Images must be an array')
  }

  if (data.tags && !Array.isArray(data.tags)) {
    errors.push('Tags must be an array')
  }

  if (data.sku && typeof data.sku !== 'string') {
    errors.push('SKU must be a string')
  } else if (data.sku && !/^[A-Z0-9-_]+$/i.test(data.sku)) {
    errors.push('SKU can only contain letters, numbers, hyphens, and underscores')
  }

  return { valid: errors.length === 0, errors }
}



// ===================================
// GET /api/products - OPTIMIZED
// ===================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '12')))
    const category = searchParams.get('category')
    const brand = searchParams.get('brand')
    const search = searchParams.get('search')
    const featured = searchParams.get('featured')
    const stock = searchParams.get('stock')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)

    const skip = (page - 1) * limit

    const ids = searchParams.get('ids')
      

    const where: Prisma.ProductWhereInput = {
      deletedAt: null
    }

    if (!includeInactive) {
      where.isActive = true
    }

    if (ids) {
      const productIds = ids.split(',').filter(Boolean)
      if (productIds.length > 0) {
        where.id = { in: productIds }
      }
    }

    if (category) {
      where.category = { slug: category }
    }

    if (brand) {
      where.brand = { slug: brand }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } }
      ]
    }

    if (featured === 'true') {
      where.isFeatured = true
    }

    const lowStockThreshold = 10

    if (stock === 'low') {
      where.stock = { gt: 0, lte: lowStockThreshold }
    } else if (stock === 'out') {
      where.stock = 0
    } else if (stock === 'in') {
      where.stock = { gt: 0 }
    }

    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = parseFloat(minPrice)
      if (maxPrice) where.price.lte = parseFloat(maxPrice)
    }

    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags }
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput = {}
    
    if (sortBy === 'stock') {
      orderBy.stock = sortOrder
    } else if (sortBy === 'price') {
      orderBy.price = sortOrder
    } else if (sortBy === 'name') {
      orderBy.name = sortOrder
    } else if (sortBy === 'salesCount') {
      orderBy.salesCount = sortOrder
    } else if (sortBy === 'viewCount') {
      orderBy.viewCount = sortOrder
    } else {
      orderBy.createdAt = sortOrder
    }

    // ✅ FIXED: Single optimized query with proper indexing
    const [products, total, stockStats] = await Promise.all([
      prisma.product.findMany({
        where,
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
              slug: true,
              image: true
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
              stock: true,
              attributes: true,
              images: true
            },
            orderBy: { createdAt: 'asc' },
            take: 5 // ✅ LIMIT variants per product
          },
          _count: {
            select: {
              reviews: true,
              orderItems: true,
              variants: true,
              wishlistItems: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.product.count({ where }),
      prisma.product.aggregate({
        where: { deletedAt: null, isActive: true },
        _sum: { stock: true, salesCount: true, viewCount: true },
        _avg: { price: true }
      })
    ])

    // ✅ OPTIMIZED: Single query for all ratings
    const productIds = products.map(p => p.id)
    
    const reviewAggregates = await prisma.review.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
        isVerified: true
      },
      _avg: {
        rating: true
      },
      _count: {
        rating: true
      }
    })

    const reviewMap = new Map(
      reviewAggregates.map(r => [
        r.productId, 
        { 
          averageRating: r._avg.rating || 0, 
          reviewCount: r._count.rating 
        }
      ])
    )

    const productsWithRatings = products.map(product => ({
      ...product,
      averageRating: parseFloat((reviewMap.get(product.id)?.averageRating || 0).toFixed(1)),
      reviewCount: reviewMap.get(product.id)?.reviewCount || 0
    }))

    // ✅ OPTIMIZED: Parallel stock alert counts
    const [lowStockCount, outOfStockCount] = await Promise.all([
      prisma.product.count({
        where: {
          ...where,
          stock: { gt: 0, lte: lowStockThreshold }
        }
      }),
      prisma.product.count({
        where: {
          ...where,
          stock: 0
        }
      })
    ])

    const headers = new Headers()
    headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30')
    headers.set('X-Total-Count', String(total))
    headers.set('X-Page', String(page))
    headers.set('X-Per-Page', String(limit))

    return NextResponse.json({
      products: productsWithRatings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + limit < total
      },
      meta: {
        stockAlerts: {
          lowStock: lowStockCount,
          outOfStock: outOfStockCount,
          total: lowStockCount + outOfStockCount,
          threshold: lowStockThreshold
        },
        statistics: {
          totalStock: stockStats._sum.stock || 0,
          totalSales: stockStats._sum.salesCount || 0,
          totalViews: stockStats._sum.viewCount || 0,
          averagePrice: stockStats._avg.price ? parseFloat(stockStats._avg.price.toFixed(2)) : 0
        },
        filters: {
          category: category || null,
          brand: brand || null,
          stock: stock || null,
          featured: featured === 'true',
          search: search || null,
          priceRange: minPrice || maxPrice ? { min: minPrice, max: maxPrice } : null,
          tags: tags || null
        }
      }
    }, { headers })

  } catch (error) {
    console.error('Error fetching products:', error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: 'Database error occurred', code: error.code },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch products',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}

// ===================================
// POST /api/products - ENHANCED
// ===================================

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
        
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const data: ProductInput = await request.json()

    const validation = validateProductInput(data)
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      )
    }
        
    const slug = data.slug || data.name.toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Invalid slug format. Use only lowercase letters, numbers, and hyphens.' },
        { status: 400 }
      )
    }

    // ✅ FIXED: Check duplicates OUTSIDE transaction
    const existingProduct = await prisma.product.findFirst({
      where: {
        OR: [
          { slug },
          { name: data.name },
          ...(data.sku ? [{ sku: data.sku }] : [])
        ],
        deletedAt: null
      }
    })

    if (existingProduct) {
      let duplicateField = 'slug'
      if (existingProduct.name === data.name) duplicateField = 'name'
      if (existingProduct.sku === data.sku) duplicateField = 'SKU'
      
      return NextResponse.json(
        { 
          error: `A product with this ${duplicateField} already exists`,
          existingProduct: { id: existingProduct.id, name: existingProduct.name }
        },
        { status: 400 }
      )
    }

    // ✅ VALIDATE foreign keys OUTSIDE transaction
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

    const initialStock = parseInt(String(data.stock || 0))

    // ✅ OPTIMIZED: Shorter transaction
    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          name: data.name.trim(),
          slug,
          description: data.description.trim(),
          price: parseFloat(String(data.price)),
          comparePrice: data.comparePrice ? parseFloat(String(data.comparePrice)) : null,
          stock: initialStock,
          sku: data.sku || null,
          images: data.images || [],
          categoryId: data.categoryId || null,
          brandId: data.brandId || null,
          tags: data.tags || [],
          specifications: data.specifications || null,
          weight: data.weight ? parseFloat(String(data.weight)) : null,
          dimensions: data.dimensions || null,
          metaTitle: data.metaTitle || data.name,
          metaDescription: data.metaDescription || data.description.substring(0, 160),
          isActive: data.isActive !== false,
          isFeatured: data.isFeatured || false,
          salesCount: 0,
          viewCount: 0
        },
        include: {
          category: true,
          brand: true
        }
      })

      if (initialStock > 0) {
        await tx.inventoryLog.create({
          data: {
            productId: newProduct.id,
            changeAmount: initialStock,
            newStock: initialStock,
            reason: 'RECEIVING',
            notes: data.inventoryNotes || 'Initial stock on product creation',
            changedByUserId: session.user.id!
          }
        })
      }

      return newProduct
    }, {
      maxWait: 5000,
      timeout: 10000,
    })

    return NextResponse.json({
      ...product,
      message: 'Product created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating product:', error)
    
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

      if (error.code === 'P2028') {
        return NextResponse.json(
          { error: 'Transaction timeout. Please try again.' },
          { status: 408 }
        )
      }
    }
  
    return NextResponse.json(
      { 
        error: 'Failed to create product',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}