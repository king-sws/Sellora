// app/api/analytics/customers/route.ts
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
   
    const daysAgo = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysAgo)

    console.log('Fetching customer analytics for period:', period, 'from:', startDate)

    try {
      // Method 1: Use Prisma queries instead of raw SQL for better compatibility
      
      // Get all users with their order data
      const usersWithOrders = await prisma.user.findMany({
        where: {
          role: 'USER'
        },
        include: {
          orders: {
            where: {
              paymentStatus: 'PAID'
            }
          }
        }
      })

      console.log('Found users:', usersWithOrders.length)

      // Process customer segments
      const segmentStats = {
        VIP: { customers: 0, totalSpent: 0, orders: 0 },
        Loyal: { customers: 0, totalSpent: 0, orders: 0 },
        Regular: { customers: 0, totalSpent: 0, orders: 0 },
        New: { customers: 0, totalSpent: 0, orders: 0 }
      }

      const topCustomersData: Array<{
        id: string;
        name: string;
        email: string;
        createdAt: Date;
        orders: number;
        total_spent: number;
        avg_order_value: number;
        last_order: Date | null;
      }> = []

      usersWithOrders.forEach(user => {
        const orderCount = user.orders.length
        const totalSpent = user.orders.reduce((sum, order) => sum + order.total, 0)
        const lastOrder = user.orders.length > 0 
          ? new Date(Math.max(...user.orders.map(o => o.createdAt.getTime())))
          : null

        // Determine segment
        let segment: keyof typeof segmentStats
        if (orderCount >= 10) {
          segment = 'VIP'
        } else if (orderCount >= 5) {
          segment = 'Loyal'
        } else if (orderCount >= 2) {
          segment = 'Regular'
        } else {
          segment = 'New'
        }

        // Update segment stats
        segmentStats[segment].customers += 1
        segmentStats[segment].totalSpent += totalSpent
        segmentStats[segment].orders += orderCount

        // Add to top customers if they have orders
        if (orderCount > 0) {
          topCustomersData.push({
            id: user.id,
            name: user.name || 'Unknown',
            email: user.email || '',
            createdAt: user.createdAt,
            orders: orderCount,
            total_spent: totalSpent,
            avg_order_value: totalSpent / orderCount,
            last_order: lastOrder
          })
        }
      })

      // Convert segment stats to the expected format
      const customerSegments = Object.entries(segmentStats).map(([segment, stats]) => ({
        segment,
        customers: stats.customers,
        avg_spent: stats.customers > 0 ? stats.totalSpent / stats.customers : 0,
        total_revenue: stats.totalSpent
      })).filter(segment => segment.customers > 0) // Only include segments with customers

      // Sort top customers by total spent
      const topCustomers = topCustomersData
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 50)

      // Customer acquisition over time using Prisma
      const acquisitionData = await prisma.user.findMany({
        where: {
          role: 'USER',
          createdAt: { gte: startDate }
        },
        select: {
          createdAt: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      })

      // Group acquisition by day
      const acquisitionMap = new Map<string, number>()
      acquisitionData.forEach(user => {
        const dateKey = user.createdAt.toISOString().split('T')[0] // YYYY-MM-DD
        acquisitionMap.set(dateKey, (acquisitionMap.get(dateKey) || 0) + 1)
      })

      const customerAcquisition = Array.from(acquisitionMap.entries()).map(([date, new_customers]) => ({
        date: new Date(date),
        new_customers
      })).sort((a, b) => a.date.getTime() - b.date.getTime())

      const result = {
        segments: customerSegments,
        topCustomers,
        acquisition: customerAcquisition
      }

      console.log('Customer analytics result:', {
        segments: result.segments.length,
        topCustomers: result.topCustomers.length,
        acquisition: result.acquisition.length
      })

      return NextResponse.json(result)

    } catch (prismaError) {
      console.error('Prisma query error:', prismaError)
      
      // Fallback: Try with raw SQL but with better error handling
      try {
        console.log('Trying fallback raw SQL queries...')
        
        // Customer segments with better error handling
        const customerSegments = await prisma.$queryRaw<Array<{
          segment: string;
          customers: number;
          avg_spent: number;
          total_revenue: number;
        }>>`
          SELECT
            CASE
              WHEN order_count >= 10 THEN 'VIP'
              WHEN order_count >= 5 THEN 'Loyal'
              WHEN order_count >= 2 THEN 'Regular'
              ELSE 'New'
            END as segment,
            COUNT(*)::int as customers,
            COALESCE(AVG(total_spent), 0)::float as avg_spent,
            COALESCE(SUM(total_spent), 0)::float as total_revenue
          FROM (
            SELECT
              u."id",
              u."name",
              COALESCE(COUNT(o."id"), 0) as order_count,
              COALESCE(SUM(o."total"), 0) as total_spent
            FROM "User" u
            LEFT JOIN "Order" o ON u."id" = o."userId" 
              AND o."paymentStatus" = 'PAID'
            WHERE u."role" = 'USER'
            GROUP BY u."id", u."name"
          ) customer_stats
          GROUP BY segment
          ORDER BY
            CASE segment
              WHEN 'VIP' THEN 1
              WHEN 'Loyal' THEN 2
              WHEN 'Regular' THEN 3
              WHEN 'New' THEN 4
            END
        `

        // Top customers
        const topCustomers = await prisma.$queryRaw<Array<{
          id: string;
          name: string;
          email: string;
          createdAt: Date;
          orders: number;
          total_spent: number;
          avg_order_value: number;
          last_order: Date;
        }>>`
          SELECT
            u."id",
            COALESCE(u."name", 'Unknown') as name,
            COALESCE(u."email", '') as email,
            u."createdAt",
            COALESCE(COUNT(o."id"), 0)::int as orders,
            COALESCE(SUM(o."total"), 0)::float as total_spent,
            COALESCE(AVG(o."total"), 0)::float as avg_order_value,
            COALESCE(MAX(o."createdAt"), u."createdAt") as last_order
          FROM "User" u
          LEFT JOIN "Order" o ON u."id" = o."userId" 
            AND o."paymentStatus" = 'PAID'
          WHERE u."role" = 'USER'
          GROUP BY u."id", u."name", u."email", u."createdAt"
          HAVING COALESCE(COUNT(o."id"), 0) > 0
          ORDER BY total_spent DESC
          LIMIT 50
        `

        // Customer acquisition over time
        const customerAcquisition = await prisma.$queryRaw<Array<{
          date: Date;
          new_customers: number;
        }>>`
          SELECT
            DATE_TRUNC('day', "createdAt") as date,
            COUNT(*)::int as new_customers
          FROM "User"
          WHERE "role" = 'USER'
            AND "createdAt" >= ${startDate}
          GROUP BY DATE_TRUNC('day', "createdAt")
          ORDER BY date ASC
        `

        return NextResponse.json({
          segments: customerSegments,
          topCustomers,
          acquisition: customerAcquisition
        })

      } catch (fallbackError) {
        console.error('Fallback SQL also failed:', fallbackError)
        
        // Return empty data structure so the UI doesn't break
        return NextResponse.json({
          segments: [],
          topCustomers: [],
          acquisition: []
        })
      }
    }

  } catch (error) {
    console.error('Error fetching customer analytics:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch customer analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}