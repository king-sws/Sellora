// app/api/brands/route.ts - Enhanced Professional Version
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'

/**
 * GET /api/brands - Get all brands with advanced filtering
 * 
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * - search: string (searches name, slug, description)
 * - includeInactive: boolean (default: false)
 * - sortBy: 'name' | 'createdAt' | 'productsCount' (default: 'name')
 * - sortOrder: 'asc' | 'desc' (default: 'asc')
 * - minProducts: number (filter brands with minimum product count)
 * - hasWebsite: boolean (filter brands with/without website)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc'
    const minProducts = searchParams.get('minProducts')
    const hasWebsite = searchParams.get('hasWebsite')

    const skip = (page - 1) * limit

    // Properly typed where clause
    const where: Prisma.BrandWhereInput = {}

    // Active filter
    if (!includeInactive) {
      where.isActive = true
    }

    // Search across multiple fields
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Website filter
    if (hasWebsite !== null) {
      where.website = hasWebsite === 'true' 
        ? { not: null }
        : null
    }

    // Fetch brands with product counts
    const [brandsData, total, statistics] = await Promise.all([
      prisma.brand.findMany({
        where,
        include: {
          _count: {
            select: {
              products: true
            }
          }
        },
        orderBy: sortBy === 'productsCount' 
          ? undefined // We'll sort after fetching
          : sortBy === 'createdAt'
          ? { createdAt: sortOrder }
          : { name: sortOrder },
        skip,
        take: limit
      }),
      prisma.brand.count({ where }),
      // Get overall statistics
      prisma.brand.aggregate({
        where: { isActive: true },
        _count: true
      })
    ])

    // Filter by minimum products count if specified
    let brands = brandsData
    if (minProducts) {
      const minCount = parseInt(minProducts)
      brands = brands.filter(brand => brand._count.products >= minCount)
    }

    // Sort by products count if requested
    if (sortBy === 'productsCount') {
      brands.sort((a, b) => {
        const diff = a._count.products - b._count.products
        return sortOrder === 'asc' ? diff : -diff
      })
    }

    // Calculate additional metrics
    const totalProducts = brands.reduce((sum, brand) => sum + brand._count.products, 0)
    const brandsWithProducts = brands.filter(b => b._count.products > 0).length
    const brandsWithWebsite = brands.filter(b => b.website).length

    // Get top brands by product count
    const topBrands = await prisma.brand.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: {
        products: {
          _count: 'desc'
        }
      },
      take: 5
    })

    return NextResponse.json({
      brands,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      meta: {
        statistics: {
          totalBrands: statistics._count,
          activeBrands: brands.length,
          brandsWithProducts,
          brandsWithWebsite,
          totalProducts,
          averageProductsPerBrand: brands.length > 0 
            ? parseFloat((totalProducts / brands.length).toFixed(2))
            : 0
        },
        topBrands: topBrands.map(brand => ({
          id: brand.id,
          name: brand.name,
          slug: brand.slug,
          productsCount: brand._count.products
        })),
        filters: {
          search: search || null,
          includeInactive,
          sortBy,
          sortOrder,
          minProducts: minProducts || null,
          hasWebsite: hasWebsite || null
        }
      }
    })
  } catch (error) {
    console.error('Error fetching brands:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch brands',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/brands - Create new brand
 * 
 * Required fields:
 * - name: string
 * 
 * Optional fields:
 * - slug: string (auto-generated if not provided)
 * - logo: string (URL)
 * - description: string
 * - website: string (URL)
 * - isActive: boolean (default: true)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
        
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const data = await request.json()

    // Validate required fields
    if (!data.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Validate name length
    if (data.name.length < 2 || data.name.length > 100) {
      return NextResponse.json(
        { error: 'Brand name must be between 2 and 100 characters' },
        { status: 400 }
      )
    }

    // Validate website URL if provided
    if (data.website) {
      try {
        new URL(data.website)
      } catch {
        return NextResponse.json(
          { error: 'Invalid website URL format' },
          { status: 400 }
        )
      }
    }

    // Generate slug if not provided
    const slug = data.slug || data.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Invalid slug format. Use only lowercase letters, numbers, and hyphens.' },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const existingBrand = await prisma.brand.findUnique({
      where: { slug }
    })

    if (existingBrand) {
      return NextResponse.json(
        { 
          error: 'A brand with this slug already exists',
          suggestion: `${slug}-${Date.now()}`
        },
        { status: 400 }
      )
    }

    // Create brand
    const brand = await prisma.brand.create({
      data: {
        name: data.name.trim(),
        slug,
        logo: data.logo || null,
        description: data.description?.trim() || null,
        website: data.website || null,
        isActive: data.isActive !== false
      },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    })

    return NextResponse.json({
      ...brand,
      message: 'Brand created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating brand:', error)
        
    // Proper Prisma error handling
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const field = (error.meta?.target as string[])?.[0] || 'field'
        return NextResponse.json(
          { error: `A brand with this ${field} already exists` },
          { status: 400 }
        )
      }
      
      if (error.code === 'P2003') {
        return NextResponse.json(
          { error: 'Invalid reference in the provided data' },
          { status: 400 }
        )
      }
    }
        
    return NextResponse.json(
      { 
        error: 'Failed to create brand',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}