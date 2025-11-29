/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/analytics/overview/route.ts (Fixed for your schema)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // days
    
    const daysAgo = parseInt(period)
    const currentPeriodStart = new Date()
    currentPeriodStart.setDate(currentPeriodStart.getDate() - daysAgo)
    
    const previousPeriodStart = new Date()
    previousPeriodStart.setDate(previousPeriodStart.getDate() - (daysAgo * 2))
    const previousPeriodEnd = new Date()
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - daysAgo)

    console.log('=== ANALYTICS OVERVIEW DEBUG ===')
    console.log('Period:', period, 'days')
    console.log('Current period start:', currentPeriodStart.toISOString())

    // First, get all valid order IDs for the period
    const validOrders = await prisma.order.findMany({
      where: {
        status: {
          in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']
        },
        createdAt: { gte: currentPeriodStart },
        deletedAt: null
      },
      select: { id: true }
    })

    const validOrderIds = validOrders.map(o => o.id)
    console.log('Valid orders in period:', validOrderIds.length)

    // Current period metrics
    const [
      currentRevenue,
      previousRevenue,
      currentOrders,
      previousOrders,
      currentCustomers,
      previousCustomers,
      avgOrderValue,
      topProductsSales, // ✅ Uses valid order IDs
      recentOrders
    ] = await Promise.all([
      // Current period revenue
      prisma.order.aggregate({
        where: {
          paymentStatus: 'PAID',
          createdAt: { gte: currentPeriodStart },
          deletedAt: null
        },
        _sum: { total: true },
        _count: true
      }),
      
      // Previous period revenue
      prisma.order.aggregate({
        where: {
          paymentStatus: 'PAID',
          createdAt: {
            gte: previousPeriodStart,
            lt: previousPeriodEnd
          },
          deletedAt: null
        },
        _sum: { total: true },
        _count: true
      }),
      
      // Current period orders
      prisma.order.count({
        where: { 
          createdAt: { gte: currentPeriodStart },
          deletedAt: null
        }
      }),
      
      // Previous period orders
      prisma.order.count({
        where: {
          createdAt: {
            gte: previousPeriodStart,
            lt: previousPeriodEnd
          },
          deletedAt: null
        }
      }),
      
      // Current period customers
      prisma.user.count({
        where: {
          role: 'USER',
          createdAt: { gte: currentPeriodStart }
        }
      }),
      
      // Previous period customers
      prisma.user.count({
        where: {
          role: 'USER',
          createdAt: {
            gte: previousPeriodStart,
            lt: previousPeriodEnd
          }
        }
      }),
      
      // Average order value
      prisma.order.aggregate({
        where: {
          paymentStatus: 'PAID',
          createdAt: { gte: currentPeriodStart },
          deletedAt: null
        },
        _avg: { total: true }
      }),
      
      // ✅ FIXED: Top selling products using groupBy with valid order IDs
      validOrderIds.length > 0 
        ? prisma.orderItem.groupBy({
            by: ['productId'],
            where: {
              orderId: { in: validOrderIds }
            },
            _sum: {
              quantity: true,
              price: true
            },
            _count: {
              id: true
            },
            orderBy: {
              _sum: {
                quantity: 'desc'
              }
            },
            take: 10
          })
        : Promise.resolve([]),
      
      // Recent orders
      prisma.order.findMany({
        where: { 
          createdAt: { gte: currentPeriodStart },
          deletedAt: null
        },
        include: {
          user: { 
            select: { 
              name: true, 
              email: true 
            } 
          },
          items: {
            include: {
              product: { 
                select: { 
                  name: true 
                } 
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ])

    console.log('Raw sales data from groupBy:', topProductsSales.length, 'products')

    // Calculate percentage changes safely
    const revenueChange = previousRevenue._sum.total && previousRevenue._sum.total > 0
      ? ((currentRevenue._sum.total || 0) - (previousRevenue._sum.total || 0)) / (previousRevenue._sum.total) * 100
      : 0

    const ordersChange = previousOrders > 0
      ? ((currentOrders - previousOrders) / previousOrders) * 100
      : 0

    const customersChange = previousCustomers > 0
      ? ((currentCustomers - previousCustomers) / previousCustomers) * 100
      : 0

    // Process top products only if we have sales data
    let processedTopProducts: any[] = []

    if (topProductsSales.length > 0) {
      // Get product details for top sellers
      const topProductIds = topProductsSales.map(item => item.productId)
      
      console.log('Fetching details for product IDs:', topProductIds)

      const products = await prisma.product.findMany({
        where: {
          id: { in: topProductIds },
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
          }
        }
      })

      console.log('Found products:', products.length)

      // Create a map of sales data for quick lookup
      const salesMap = new Map(
        topProductsSales.map(item => [
          item.productId, 
          {
            totalSold: item._sum.quantity || 0,
            revenue: item._sum.price || 0,
            orderCount: item._count.id
          }
        ])
      )

      // Combine products with sales data and sort by actual sales
      processedTopProducts = products
        .map(product => {
          const sales = salesMap.get(product.id)
          return {
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: product.price,
            images: product.images || [],
            category: product.category,
            totalSold: sales?.totalSold || 0,
            revenue: sales?.revenue || 0,
            orderCount: sales?.orderCount || 0
          }
        })
        .filter(product => product.totalSold > 0)
        .sort((a, b) => b.totalSold - a.totalSold)
    }

    console.log('✅ ANALYTICS OVERVIEW - Final processed data:')
    console.log('Revenue:', currentRevenue._sum.total || 0)
    console.log('Orders:', currentOrders)
    console.log('Customers:', currentCustomers)
    console.log('Top products count:', processedTopProducts.length)
    
    if (processedTopProducts.length > 0) {
      console.log('Top products with sales:')
      processedTopProducts.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name}: ${p.totalSold} sold (revenue: $${p.revenue})`)
      })
    } else {
      console.log('⚠️ No products with sales in this period')
    }
    console.log('=== END ANALYTICS DEBUG ===')

    const response = {
      overview: {
        revenue: {
          current: currentRevenue._sum.total || 0,
          previous: previousRevenue._sum.total || 0,
          change: revenueChange
        },
        orders: {
          current: currentOrders,
          previous: previousOrders,
          change: ordersChange
        },
        customers: {
          current: currentCustomers,
          previous: previousCustomers,
          change: customersChange
        },
        avgOrderValue: avgOrderValue._avg.total || 0
      },
      topProducts: processedTopProducts,
      recentOrders: recentOrders,
      meta: {
        period: period,
        currentPeriodStart: currentPeriodStart.toISOString(),
        hasSalesData: processedTopProducts.length > 0,
        totalProductsWithSales: topProductsSales.length,
        validOrdersCount: validOrderIds.length
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ ERROR in analytics overview:', error)
    
    return NextResponse.json({ 
      error: 'Failed to fetch analytics',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    }, { status: 500 })
  }
}