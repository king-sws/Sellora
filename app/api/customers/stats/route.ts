// app/api/customers/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'

// GET /api/customers/stats - Enhanced customer analytics and statistics
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

    const [
      // Basic counts
      totalCustomers,
      totalAdmins,
      newCustomersThisMonth,
      newCustomersLastMonth,
      verifiedCustomers,
      customersWithOrders,
      
      // Advanced metrics
      customersLast30Days,
      customersLast60Days,
      activeCustomers30Days,
      activeCustomers90Days,
      
      // Top performers
      topCustomersBySpending,
      topCustomersByOrders,
      recentCustomers,
      
      // Segmentation data
      customerOrderCounts,
      customerSpendingRanges,
      
      // Geographic data
      customersByCountry,
      
      // Engagement metrics
      customersWithReviews,
      customersWithMultipleAddresses,
      
      // Registration trend
      customerRegistrationTrend,
      
      // Churn analysis
      inactiveCustomers,
      atRiskCustomers
    ] = await Promise.all([
      // Basic counts
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ 
        where: { 
          role: 'USER',
          createdAt: { gte: thisMonth }
        }
      }),
      prisma.user.count({ 
        where: { 
          role: 'USER',
          createdAt: { 
            gte: lastMonth,
            lt: thisMonth
          }
        }
      }),
      prisma.user.count({ 
        where: { 
          role: 'USER',
          emailVerified: { not: null }
        }
      }),
      prisma.user.count({
        where: {
          role: 'USER',
          orders: { some: {} }
        }
      }),
      
      // Advanced metrics
      prisma.user.count({ 
        where: { 
          role: 'USER',
          createdAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.user.count({ 
        where: { 
          role: 'USER',
          createdAt: { gte: sixtyDaysAgo }
        }
      }),
      prisma.user.count({
        where: {
          role: 'USER',
          orders: {
            some: {
              createdAt: { gte: thirtyDaysAgo }
            }
          }
        }
      }),
      prisma.user.count({
        where: {
          role: 'USER',
          orders: {
            some: {
              createdAt: { gte: ninetyDaysAgo }
            }
          }
        }
      }),
      
      // Top performers with order data
      prisma.user.findMany({
        where: { role: 'USER' },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          orders: {
            select: {
              total: true,
              status: true,
              createdAt: true
            }
          }
        },
        take: 100 // Get more for processing
      }),
      
      // Duplicate for orders count processing
      prisma.user.findMany({
        where: { role: 'USER' },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          orders: {
            select: {
              id: true,
              status: true,
              createdAt: true
            }
          }
        },
        take: 100
      }),
      
      // Recent customers
      prisma.user.findMany({
        where: { role: 'USER' },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          emailVerified: true,
          _count: {
            select: { orders: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      
      // Order count distribution
      prisma.$queryRaw`
        SELECT 
          CASE 
            WHEN order_count = 0 THEN '0'
            WHEN order_count = 1 THEN '1'
            WHEN order_count BETWEEN 2 AND 5 THEN '2-5'
            WHEN order_count BETWEEN 6 AND 10 THEN '6-10'
            WHEN order_count > 10 THEN '10+'
          END as range,
          COUNT(*) as count
        FROM (
          SELECT u.id, COUNT(o.id) as order_count
          FROM "User" u
          LEFT JOIN "Order" o ON u.id = o."userId"
          WHERE u.role = 'USER'
          GROUP BY u.id
        ) subquery
        GROUP BY range
        ORDER BY 
          CASE range
            WHEN '0' THEN 1
            WHEN '1' THEN 2
            WHEN '2-5' THEN 3
            WHEN '6-10' THEN 4
            WHEN '10+' THEN 5
          END
      `,
      
      // Spending distribution
      prisma.$queryRaw`
        SELECT 
          CASE 
            WHEN total_spent = 0 THEN '$0'
            WHEN total_spent BETWEEN 0.01 AND 100 THEN '$1-$100'
            WHEN total_spent BETWEEN 100.01 AND 500 THEN '$100-$500'
            WHEN total_spent BETWEEN 500.01 AND 1000 THEN '$500-$1K'
            WHEN total_spent BETWEEN 1000.01 AND 5000 THEN '$1K-$5K'
            WHEN total_spent > 5000 THEN '$5K+'
          END as range,
          COUNT(*) as count
        FROM (
          SELECT u.id, COALESCE(SUM(o.total), 0) as total_spent
          FROM "User" u
          LEFT JOIN "Order" o ON u.id = o."userId" AND o.status = 'DELIVERED'
          WHERE u.role = 'USER'
          GROUP BY u.id
        ) subquery
        GROUP BY range
        ORDER BY 
          CASE range
            WHEN '$0' THEN 1
            WHEN '$1-$100' THEN 2
            WHEN '$100-$500' THEN 3
            WHEN '$500-$1K' THEN 4
            WHEN '$1K-$5K' THEN 5
            WHEN '$5K+' THEN 6
          END
      `,
      
      // Geographic distribution
      prisma.$queryRaw`
        SELECT a.country, COUNT(DISTINCT u.id) as customer_count
        FROM "User" u
        JOIN "Address" a ON u.id = a."userId"
        WHERE u.role = 'USER'
        GROUP BY a.country
        ORDER BY customer_count DESC
        LIMIT 10
      `,
      
      // Customers with reviews
      prisma.user.count({
        where: {
          role: 'USER',
          reviews: { some: {} }
        }
      }),
      
      // Customers with multiple addresses
      prisma.user.count({
        where: {
          role: 'USER',
          addresses: {
            some: {}
          }
        }
      }),
      
      // Registration trend (last 12 months)
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*) as count
        FROM "User" 
        WHERE "role" = 'USER' 
          AND "createdAt" >= ${oneYearAgo}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
      `,
      
      // Inactive customers (no orders in 6+ months)
      prisma.user.count({
        where: {
          role: 'USER',
          orders: {
            every: {
              createdAt: {
                lt: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
              }
            }
          }
        }
      }),
      
      // At-risk customers (recent order but concerning patterns)
      prisma.user.findMany({
        where: {
          role: 'USER',
          orders: {
            some: {
              createdAt: { gte: ninetyDaysAgo },
              OR: [
                { status: 'CANCELLED' },
                { status: 'REFUNDED' }
              ]
            }
          }
        },
        select: { id: true },
        take: 1
      })
    ])

    // Process top customers by spending
    const topCustomersWithSpending = topCustomersBySpending
      .map(customer => ({
        ...customer,
        totalSpent: customer.orders.reduce((sum, order) => {
          return order.status === 'DELIVERED' ? sum + order.total : sum
        }, 0),
        totalOrders: customer.orders.length,
        completedOrders: customer.orders.filter(o => o.status === 'DELIVERED').length,
        lastOrderDate: customer.orders[0]?.createdAt || null,
        orders: undefined
      }))
      .filter(customer => customer.totalSpent > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)

    // Process top customers by order count
    const topCustomersByOrderCount = topCustomersByOrders
      .map(customer => ({
        ...customer,
        totalOrders: customer.orders.length,
        completedOrders: customer.orders.filter(o => o.status === 'DELIVERED').length,
        lastOrderDate: customer.orders[0]?.createdAt || null,
        orders: undefined
      }))
      .filter(customer => customer.totalOrders > 0)
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, 10)

    // Calculate growth rates
    const customerGrowthRate = newCustomersLastMonth > 0 
      ? ((newCustomersThisMonth - newCustomersLastMonth) / newCustomersLastMonth * 100).toFixed(1)
      : newCustomersThisMonth > 0 ? '100' : '0'

    const activationRate = totalCustomers > 0 
      ? (customersWithOrders / totalCustomers * 100).toFixed(1)
      : '0'

    const verificationRate = totalCustomers > 0
      ? (verifiedCustomers / totalCustomers * 100).toFixed(1)
      : '0'

    const engagementRate = totalCustomers > 0
      ? (customersWithReviews / totalCustomers * 100).toFixed(1)
      : '0'

    const retentionRate30Days = customersLast60Days > 0
      ? ((activeCustomers30Days - newCustomersThisMonth) / (customersLast60Days - customersLast30Days) * 100).toFixed(1)
      : '0'

    return NextResponse.json({
      // Overview metrics
      overview: {
        totalCustomers,
        totalAdmins,
        newCustomersThisMonth,
        newCustomersLastMonth,
        customerGrowthRate: parseFloat(customerGrowthRate),
        verifiedCustomers,
        verificationRate: parseFloat(verificationRate)
      },

      // Engagement metrics
      engagement: {
        customersWithOrders,
        activationRate: parseFloat(activationRate),
        activeCustomers30Days,
        activeCustomers90Days,
        customersWithReviews,
        engagementRate: parseFloat(engagementRate),
        customersWithMultipleAddresses,
        retentionRate30Days: parseFloat(retentionRate30Days)
      },

      // Top performers
      topPerformers: {
        bySpending: topCustomersWithSpending,
        byOrderCount: topCustomersByOrderCount,
        recentCustomers
      },

      // Customer segmentation
      segmentation: {
        byOrderCount: customerOrderCounts,
        bySpending: customerSpendingRanges,
        geographic: customersByCountry
      },

      // Trends and patterns
      trends: {
        registrationTrend: customerRegistrationTrend,
        inactiveCustomers,
        atRiskCustomers: atRiskCustomers.length
      },

      // Conversion and health metrics
      health: {
        conversionRate: activationRate,
        churnRisk: inactiveCustomers,
        loyaltyScore: totalCustomers > 0 
          ? (topCustomersWithSpending.length / totalCustomers * 100).toFixed(1)
          : '0'
      }
    })
  } catch (error) {
    console.error('Error fetching customer stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer statistics' },
      { status: 500 }
    )
  }
}