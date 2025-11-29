// app/api/products/best-sellers-real/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '8')))
    const categoryId = searchParams.get('categoryId')
    const timeFrame = searchParams.get('timeFrame') // '7d', '30d', '90d', 'all'

    // Build date filter for time frame
    let dateFilter = {}
    if (timeFrame && timeFrame !== 'all') {
      const days = timeFrame === '7d' ? 7 : timeFrame === '30d' ? 30 : 90
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      dateFilter = { createdAt: { gte: startDate } }
    }

    // ✅ FIX: Remove the ambiguous _count.id field
    const salesData = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          status: {
            in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']
          },
          ...dateFilter
        }
      },
      _sum: {
        quantity: true
      }
      // ❌ REMOVED: _count: { id: true } - this was causing the ambiguous column error
    })

    console.log(`Found ${salesData.length} products with sales`)

    // If no sales data, return featured or newest products
    if (salesData.length === 0) {
      console.log('No sales data found, returning featured/newest products')
      
      const fallbackProducts = await prisma.product.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          ...(categoryId && { categoryId })
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
          _count: {
            select: {
              reviews: true
            }
          }
        },
        orderBy: [
          { isFeatured: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit
      })

      // Get ratings
      const productIds = fallbackProducts.map(p => p.id)
      const reviewAggregates = await prisma.review.groupBy({
        by: ['productId'],
        where: {
          productId: { in: productIds },
          isVerified: true
        },
        _avg: { rating: true }
      })

      const reviewMap = new Map(
        reviewAggregates.map(r => [r.productId, r._avg.rating || 0])
      )

      const formattedProducts = fallbackProducts.map(product => ({
        ...product,
        actualSales: 0,
        rating: parseFloat((reviewMap.get(product.id) || 0).toFixed(1)),
        reviewCount: product._count.reviews
      }))

      return NextResponse.json({
        products: formattedProducts,
        meta: {
          totalProducts: formattedProducts.length,
          hasSalesData: false,
          timeFrame: timeFrame || 'all'
        }
      })
    }

    // Sort by sales quantity descending
    salesData.sort((a, b) => {
      const aQty = a._sum.quantity || 0
      const bQty = b._sum.quantity || 0
      return bQty - aQty
    })

    // Get top product IDs
    const topProductIds = salesData.slice(0, limit).map(item => item.productId)

    // Fetch full product details
    const products = await prisma.product.findMany({
      where: {
        id: { in: topProductIds },
        isActive: true,
        deletedAt: null,
        ...(categoryId && { categoryId })
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
        _count: {
          select: {
            reviews: true,
            orderItems: true
          }
        }
      }
    })

    // Get ratings for these products
    const reviewAggregates = await prisma.review.groupBy({
      by: ['productId'],
      where: {
        productId: { in: topProductIds },
        isVerified: true
      },
      _avg: {
        rating: true
      }
    })

    const reviewMap = new Map(
      reviewAggregates.map(r => [r.productId, r._avg.rating || 0])
    )

    // Create a map of sales data for quick lookup
    const salesMap = new Map(
      salesData.map(item => [item.productId, item._sum.quantity || 0])
    )

    // Combine products with sales data and sort by actual sales
    const productsWithSales = products
      .map(product => ({
        ...product,
        actualSales: salesMap.get(product.id) || 0,
        rating: parseFloat((reviewMap.get(product.id) || 0).toFixed(1)),
        reviewCount: product._count.reviews,
        totalOrders: product._count.orderItems
      }))
      .sort((a, b) => b.actualSales - a.actualSales)

    console.log('Best Sellers:', productsWithSales.map(p => ({
      name: p.name,
      sales: p.actualSales
    })))

    // Calculate statistics
    const totalSales = productsWithSales.reduce((sum, p) => sum + p.actualSales, 0)
    const avgSales = totalSales / productsWithSales.length

    return NextResponse.json({
      products: productsWithSales,
      meta: {
        totalProducts: productsWithSales.length,
        totalSales,
        averageSales: parseFloat(avgSales.toFixed(2)),
        hasSalesData: true,
        timeFrame: timeFrame || 'all',
        categoryFilter: categoryId || null
      }
    })

  } catch (error) {
    console.error('Error fetching real best sellers:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch best sellers',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}