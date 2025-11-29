/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/categories/[id]/best-sellers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    
    // Pagination
    const limit = parseInt(searchParams.get('limit') || '10')
    const page = parseInt(searchParams.get('page') || '1')
    const skip = (page - 1) * limit
    
    // Sorting options
    const sortBy = searchParams.get('sortBy') || 'salesCount' // salesCount, viewCount, revenue
    const includeChildren = searchParams.get('includeChildren') === 'true'

    // Validate category exists
    const category = await prisma.category.findUnique({
      where: { id, deletedAt: null },
      include: {
        children: includeChildren ? {
          where: { deletedAt: null },
          select: { id: true }
        } : false
      }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Build category IDs array (include children if requested)
    const categoryIds = includeChildren && category.children
      ? [category.id, ...category.children.map((c: any) => c.id)]
      : [category.id]

    // Build orderBy based on sortBy parameter
    let orderBy: any = {}
    switch (sortBy) {
      case 'viewCount':
        orderBy = { viewCount: 'desc' }
        break
      case 'revenue':
        orderBy = { salesCount: 'desc' } // We'll calculate revenue in the response
        break
      default:
        orderBy = { salesCount: 'desc' }
    }

    // Fetch best selling products
    const [products, totalProducts] = await Promise.all([
      prisma.product.findMany({
        where: {
          categoryId: { in: categoryIds },
          isActive: true,
          deletedAt: null
        },
        include: {
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
          reviews: {
            select: {
              rating: true,
              isVerified: true
            }
          },
          _count: {
            select: {
              reviews: true,
              orderItems: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.product.count({
        where: {
          categoryId: { in: categoryIds },
          isActive: true,
          deletedAt: null
        }
      })
    ])

    // Calculate ratings and revenue
    const productsWithStats = products.map(product => {
      const allReviews = product.reviews
      const averageRating = allReviews.length > 0
        ? allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length
        : 0
      
      const verifiedCount = allReviews.filter(r => r.isVerified).length
      const totalRevenue = product.price * product.salesCount
      const { reviews, ...productData } = product
      
      return {
        ...productData,
        rating: parseFloat(averageRating.toFixed(1)),
        reviewCount: product._count.reviews,
        verifiedReviewCount: verifiedCount,
        totalRevenue,
        totalOrders: product._count.orderItems
      }
    })

    // Sort by revenue if requested
    if (sortBy === 'revenue') {
      productsWithStats.sort((a, b) => b.totalRevenue - a.totalRevenue)
    }

    return NextResponse.json({
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug
      },
      products: productsWithStats,
      pagination: {
        page,
        limit,
        total: totalProducts,
        pages: Math.ceil(totalProducts / limit),
        hasMore: skip + limit < totalProducts
      },
      meta: {
        sortBy,
        includeChildren
      }
    })

  } catch (error) {
    console.error('Error fetching best sellers by category:', error)
    return NextResponse.json(
      { error: 'Failed to fetch best sellers' },
      { status: 500 }
    )
  }
}
