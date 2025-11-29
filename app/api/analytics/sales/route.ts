// app/api/analytics/sales/route.ts
import { auth } from "@/auth"
import { prisma } from "@/db/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30'
    const groupBy = searchParams.get('groupBy') || 'day'
    
    const daysAgo = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysAgo)

    console.log('Fetching sales analytics for period:', period, 'from:', startDate)

    // Method 1: Using Prisma queries instead of raw SQL (recommended)
    try {
      // Get all paid orders in the period
      const paidOrders = await prisma.order.findMany({
        where: {
          paymentStatus: 'PAID',
          createdAt: { gte: startDate }
        },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      })

      console.log('Found paid orders:', paidOrders.length)

      // Process sales timeline
      const timelineMap = new Map<string, { orders: number; revenue: number; customers: Set<string> }>()
      
      paidOrders.forEach(order => {
        let periodKey: string
        const orderDate = new Date(order.createdAt)
        
        // Group by the specified period
        if (groupBy === 'day') {
          periodKey = orderDate.toISOString().split('T')[0] // YYYY-MM-DD
        } else if (groupBy === 'week') {
          // Get start of week (Monday)
          const startOfWeek = new Date(orderDate)
          startOfWeek.setDate(orderDate.getDate() - orderDate.getDay() + 1)
          periodKey = startOfWeek.toISOString().split('T')[0]
        } else { // month
          periodKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-01`
        }
        
        if (!timelineMap.has(periodKey)) {
          timelineMap.set(periodKey, { orders: 0, revenue: 0, customers: new Set() })
        }
        
        const timelineData = timelineMap.get(periodKey)!
        timelineData.orders += 1
        timelineData.revenue += order.total
        timelineData.customers.add(order.userId)
      })

      // Convert timeline map to array
      const salesTimeline = Array.from(timelineMap.entries()).map(([period, data]) => ({
        period,
        orders: data.orders,
        revenue: data.revenue,
        customers: data.customers.size
      })).sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime())

      // Process sales by category
      const categoryMap = new Map<string, { quantity: number; revenue: number }>()
      
      paidOrders.forEach(order => {
        order.items.forEach(item => {
          const categoryName = item.product.category?.name || 'Uncategorized'
          
          if (!categoryMap.has(categoryName)) {
            categoryMap.set(categoryName, { quantity: 0, revenue: 0 })
          }
          
          const categoryData = categoryMap.get(categoryName)!
          categoryData.quantity += item.quantity
          categoryData.revenue += item.quantity * item.price
        })
      })

      const salesByCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        quantity: data.quantity,
        revenue: data.revenue
      })).sort((a, b) => b.revenue - a.revenue)

      // Get conversion funnel data
      const [visitors, cartUsers, orderUsers, paidUsers] = await Promise.all([
        // Total users created in period (visitors proxy)
        prisma.user.count({
          where: {
            role: 'USER',
            createdAt: { gte: startDate }
          }
        }),
        
        // Users who added items to cart
        prisma.user.count({
          where: {
            role: 'USER',
            cart: {
              some: {
                createdAt: { gte: startDate }
              }
            }
          }
        }),
        
        // Users who placed orders
        prisma.user.count({
          where: {
            role: 'USER',
            orders: {
              some: {
                createdAt: { gte: startDate }
              }
            }
          }
        }),
        
        // Users who completed payment
        prisma.user.count({
          where: {
            role: 'USER',
            orders: {
              some: {
                paymentStatus: 'PAID',
                createdAt: { gte: startDate }
              }
            }
          }
        })
      ])

      const result = {
        salesTimeline,
        salesByCategory,
        conversionFunnel: {
          visitors,
          cartUsers,
          orderUsers,
          paidUsers
        }
      }

      console.log('Sales analytics result:', {
        timelineItems: result.salesTimeline.length,
        categoryItems: result.salesByCategory.length,
        funnel: result.conversionFunnel
      })

      return NextResponse.json(result)

    } catch (prismaError) {
      console.error('Prisma query error:', prismaError)
      
      // Fallback: Return empty data structure
      return NextResponse.json({
        salesTimeline: [],
        salesByCategory: [],
        conversionFunnel: {
          visitors: 0,
          cartUsers: 0,
          orderUsers: 0,
          paidUsers: 0
        }
      })
    }

  } catch (error) {
    console.error('Error fetching sales analytics:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch sales analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Alternative raw SQL version (if you prefer raw SQL)
export async function GET_RAW_SQL_VERSION(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30'
    const groupBy = searchParams.get('groupBy') || 'day'
    
    const daysAgo = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysAgo)

    // Fixed raw SQL queries
    const salesTimeline = await prisma.$queryRaw<Array<{
      period: Date;
      orders: number;
      revenue: number;
      customers: number;
    }>>`
      SELECT 
        DATE_TRUNC(${groupBy}::text, "createdAt") as period,
        COUNT(*)::int as orders,
        COALESCE(SUM("total"), 0)::float as revenue,
        COUNT(DISTINCT "userId")::int as customers
      FROM "Order" 
      WHERE "paymentStatus" = 'PAID'
        AND "createdAt" >= ${startDate}
      GROUP BY DATE_TRUNC(${groupBy}::text, "createdAt")
      ORDER BY period ASC
    `

    const salesByCategory = await prisma.$queryRaw<Array<{
      category: string;
      quantity: number;
      revenue: number;
    }>>`
      SELECT 
        COALESCE(c."name", 'Uncategorized') as category,
        COALESCE(SUM(oi."quantity"), 0)::int as quantity,
        COALESCE(SUM(oi."quantity" * oi."price"), 0)::float as revenue
      FROM "OrderItem" oi
      JOIN "Product" p ON oi."productId" = p."id"
      LEFT JOIN "Category" c ON p."categoryId" = c."id"
      JOIN "Order" o ON oi."orderId" = o."id"
      WHERE o."paymentStatus" = 'PAID'
        AND o."createdAt" >= ${startDate}
      GROUP BY c."name"
      HAVING SUM(oi."quantity" * oi."price") > 0
      ORDER BY revenue DESC
    `

    // Get conversion funnel data
    const [visitors, cartUsers, orderUsers, paidUsers] = await Promise.all([
      prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int as count
        FROM "User"
        WHERE "role" = 'USER'
          AND "createdAt" >= ${startDate}
      `.then(result => result[0]?.count || 0),
      
      prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(DISTINCT "userId")::int as count
        FROM "CartItem"
        WHERE "createdAt" >= ${startDate}
      `.then(result => result[0]?.count || 0),
      
      prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(DISTINCT "userId")::int as count
        FROM "Order"
        WHERE "createdAt" >= ${startDate}
      `.then(result => result[0]?.count || 0),
      
      prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(DISTINCT "userId")::int as count
        FROM "Order"
        WHERE "paymentStatus" = 'PAID'
          AND "createdAt" >= ${startDate}
      `.then(result => result[0]?.count || 0)
    ])

    return NextResponse.json({
      salesTimeline: salesTimeline.map(item => ({
        ...item,
        period: item.period.toISOString()
      })),
      salesByCategory,
      conversionFunnel: {
        visitors,
        cartUsers,
        orderUsers,
        paidUsers
      }
    })

  } catch (error) {
    console.error('Error fetching sales analytics:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch sales analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}