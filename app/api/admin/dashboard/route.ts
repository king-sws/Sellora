/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/admin/dashboard/route.ts - Fixed with correct sales data
import { NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('=== DASHBOARD API - FETCHING DATA ===')

    // Get current date ranges
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // ✅ STEP 1: Get valid orders for filtering sales
    const validOrders = await prisma.order.findMany({
      where: {
        status: {
          in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']
        },
        deletedAt: null
      },
      select: { id: true }
    })

    const validOrderIds = validOrders.map(o => o.id)
    console.log('Valid orders found:', validOrderIds.length)

    // Parallel queries for better performance
    const [
      // Revenue & Orders
      totalRevenue,
      totalOrders,
      monthlyRevenue,
      lastMonthRevenue,
      weeklyRevenue,
      
      // Customers
      totalCustomers,
      newCustomersThisMonth,
      newCustomersThisWeek,
      
      // Products & Inventory
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      featuredProducts,
      
      // Order Status
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      ordersByStatus,
      
      // Payment & Refunds
      paidOrders,
      failedPayments,
      pendingRefunds,
      totalRefunded,
      
      // Recent Activity
      recentOrders,
      recentRefunds,
      recentInventoryChanges,
      recentOrderNotes,
      
      // ✅ FIXED: Top Performers using correct groupBy
      topSellingProductsSales,
      topCustomers,
      topBrands,
      topCategories,
      
      // Charts & Analytics
      revenueChart,
      orderSourceStats,
      paymentProviderStats,
      
      // Reviews & Engagement
      totalReviews,
      averageRating,
      recentReviews,
      
      // Coupons
      activeCoupons,
      expiringSoonCoupons,
      
    ] = await Promise.all([
      // Total Revenue (PAID orders only)
      prisma.order.aggregate({
        _sum: { total: true },
        where: { 
          paymentStatus: 'PAID',
          status: { notIn: ['CANCELLED', 'REFUNDED'] }
        }
      }),
      
      // Total Orders
      prisma.order.count({
        where: { deletedAt: null }
      }),
      
      // Monthly Revenue
      prisma.order.aggregate({
        _sum: { total: true },
        where: {
          paymentStatus: 'PAID',
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
          createdAt: { gte: startOfMonth }
        }
      }),
      
      // Last Month Revenue
      prisma.order.aggregate({
        _sum: { total: true },
        where: {
          paymentStatus: 'PAID',
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
          createdAt: { 
            gte: startOfLastMonth,
            lte: endOfLastMonth
          }
        }
      }),
      
      // Weekly Revenue
      prisma.order.aggregate({
        _sum: { total: true },
        where: {
          paymentStatus: 'PAID',
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
          createdAt: { gte: sevenDaysAgo }
        }
      }),
      
      // Total Customers
      prisma.user.count({
        where: { role: 'USER' }
      }),
      
      // New Customers This Month
      prisma.user.count({
        where: {
          role: 'USER',
          createdAt: { gte: startOfMonth }
        }
      }),
      
      // New Customers This Week
      prisma.user.count({
        where: {
          role: 'USER',
          createdAt: { gte: sevenDaysAgo }
        }
      }),
      
      // Total Products
      prisma.product.count({
        where: { deletedAt: null }
      }),
      
      // Active Products
      prisma.product.count({
        where: { 
          isActive: true,
          deletedAt: null 
        }
      }),
      
      // Low Stock Products (stock > 0 AND stock <= 10)
      prisma.product.count({
        where: {
          stock: { gt: 0, lte: 10 },
          isActive: true,
          deletedAt: null
        }
      }),
      
      // Out of Stock Products
      prisma.product.count({
        where: {
          stock: 0,
          isActive: true,
          deletedAt: null
        }
      }),
      
      // Featured Products
      prisma.product.count({
        where: {
          isFeatured: true,
          isActive: true,
          deletedAt: null
        }
      }),
      
      // Pending Orders
      prisma.order.count({
        where: { status: 'PENDING', deletedAt: null }
      }),
      
      // Processing Orders
      prisma.order.count({
        where: { status: 'PROCESSING', deletedAt: null }
      }),
      
      // Shipped Orders
      prisma.order.count({
        where: { status: 'SHIPPED', deletedAt: null }
      }),
      
      // Delivered Orders
      prisma.order.count({
        where: { status: 'DELIVERED', deletedAt: null }
      }),
      
      // Cancelled Orders
      prisma.order.count({
        where: { status: 'CANCELLED' }
      }),
      
      // Orders by Status
      prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
        where: { deletedAt: null }
      }),
      
      // Paid Orders
      prisma.order.count({
        where: { paymentStatus: 'PAID', deletedAt: null }
      }),
      
      // Failed Payments
      prisma.order.count({
        where: { paymentStatus: 'FAILED', deletedAt: null }
      }),
      
      // Pending Refunds
      prisma.refund.count({
        where: { status: 'PENDING' }
      }),
      
      // Total Refunded Amount
      prisma.refund.aggregate({
        _sum: { amount: true },
        where: { status: 'PROCESSED' }
      }),
      
      // Recent Orders (last 10)
      prisma.order.findMany({
        take: 10,
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              image: true
            }
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  images: true
                }
              }
            }
          },
          shippingAddress: true,
          _count: {
            select: {
              notes: true,
              refunds: true
            }
          }
        }
      }),
      
      // Recent Refunds
      prisma.refund.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              orderNumber: true,
              total: true
            }
          },
          requestedByUser: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }),
      
      // Recent Inventory Changes
      prisma.inventoryLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              name: true,
              images: true
            }
          },
          variant: {
            select: {
              name: true
            }
          },
          changedByUser: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }),
      
      // Recent Order Notes
      prisma.orderNote.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              orderNumber: true
            }
          },
          author: {
            select: {
              name: true
            }
          }
        }
      }),
      
      // ✅ FIXED: Top Selling Products using groupBy with valid orders
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
            _count: { id: true },
            orderBy: {
              _sum: {
                quantity: 'desc'
              }
            },
            take: 10
          })
        : Promise.resolve([]),
      
      // Top Customers (by total spent)
      prisma.order.groupBy({
        by: ['userId'],
        _sum: { total: true },
        _count: { id: true },
        where: {
          paymentStatus: 'PAID',
          status: { notIn: ['CANCELLED', 'REFUNDED'] }
        },
        orderBy: {
          _sum: {
            total: 'desc'
          }
        },
        take: 5
      }),
      
      // Top Brands
      prisma.product.groupBy({
        by: ['brandId'],
        _count: { id: true },
        _sum: { salesCount: true },
        where: {
          brandId: { not: null },
          isActive: true,
          deletedAt: null
        },
        orderBy: {
          _sum: {
            salesCount: 'desc'
          }
        },
        take: 5
      }),
      
      // Top Categories
      prisma.product.groupBy({
        by: ['categoryId'],
        _count: { id: true },
        _sum: { salesCount: true },
        where: {
          categoryId: { not: null },
          isActive: true,
          deletedAt: null
        },
        orderBy: {
          _sum: {
            salesCount: 'desc'
          }
        },
        take: 5
      }),
      
      // Revenue Chart (last 30 days)
      prisma.order.findMany({
        where: {
          paymentStatus: 'PAID',
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
          createdAt: { gte: thirtyDaysAgo }
        },
        select: {
          total: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      }),
      
      // Orders by Source
      prisma.order.groupBy({
        by: ['source'],
        _count: { id: true },
        where: { deletedAt: null }
      }),
      
      // Orders by Payment Provider
      prisma.order.groupBy({
        by: ['paymentProvider'],
        _count: { id: true },
        where: { 
          paymentStatus: 'PAID',
          deletedAt: null 
        }
      }),
      
      // Total Reviews
      prisma.review.count(),
      
      // Average Rating
      prisma.review.aggregate({
        _avg: { rating: true }
      }),
      
      // Recent Reviews
      prisma.review.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              image: true
            }
          },
          product: {
            select: {
              name: true,
              images: true
            }
          }
        }
      }),
      
      // Active Coupons
      prisma.coupon.count({
        where: {
          isActive: true,
          deletedAt: null,
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: new Date() } }
          ]
        }
      }),
      
      // Expiring Soon Coupons (within 7 days)
      prisma.coupon.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          expiresAt: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        },
        select: {
          code: true,
          expiresAt: true,
          usedCount: true,
          maxUses: true
        }
      }),
    ])

    console.log('Top selling products raw data:', topSellingProductsSales.length, 'products')

    // ✅ STEP 2: Get product details for top sellers
    let topProductsWithDetails: { totalSold: number; totalRevenue: number; totalOrders: number; name: string; id: string; images: string[]; brand: { name: string } | null; category: { name: string } | null; stock: number; slug: string; price: number }[] = []

    if (topSellingProductsSales.length > 0) {
      const topProductIds = topSellingProductsSales.map(item => item.productId)
      
      const products = await prisma.product.findMany({
        where: {
          id: { in: topProductIds },
          isActive: true,
          deletedAt: null
        },
        select: {
          id: true,
          name: true,
          price: true,
          images: true,
          slug: true,
          stock: true,
          brand: {
            select: { name: true }
          },
          category: {
            select: { name: true }
          }
        }
      })

      // Create sales map
      const salesMap = new Map(
        topSellingProductsSales.map(item => [
          item.productId,
          {
            totalSold: item._sum.quantity || 0,
            totalRevenue: item._sum.price || 0,
            totalOrders: item._count.id
          }
        ])
      )

      // Combine and sort
      topProductsWithDetails = products
        .map(product => {
          const sales = salesMap.get(product.id)
          return {
            ...product,
            totalSold: sales?.totalSold || 0,
            totalRevenue: sales?.totalRevenue || 0,
            totalOrders: sales?.totalOrders || 0
          }
        })
        .filter(p => p.totalSold > 0)
        .sort((a, b) => b.totalSold - a.totalSold)

      console.log('✅ DASHBOARD - Top products with sales:')
      topProductsWithDetails.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name}: ${p.totalSold} sold`)
      })
    } else {
      console.log('⚠️ No sales data found - no valid orders')
    }

    // Get customer details for top customers
    const topCustomersWithDetails = await Promise.all(
      topCustomers.map(async (item: any) => {
        const user = await prisma.user.findUnique({
          where: { id: item.userId },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true
          }
        })
        return {
          ...user,
          totalSpent: item._sum.total || 0,
          totalOrders: item._count.id
        }
      })
    )

    // Get brand details for top brands
    const topBrandsWithDetails = await Promise.all(
      topBrands.filter(b => b.brandId).map(async (item: any) => {
        const brand = await prisma.brand.findUnique({
          where: { id: item.brandId },
          select: {
            id: true,
            name: true,
            logo: true,
            slug: true
          }
        })
        return {
          ...brand,
          productCount: item._count.id,
          totalSales: item._sum.salesCount || 0
        }
      })
    )

    // Get category details for top categories
    const topCategoriesWithDetails = await Promise.all(
      topCategories.filter(c => c.categoryId).map(async (item: any) => {
        const category = await prisma.category.findUnique({
          where: { id: item.categoryId },
          select: {
            id: true,
            name: true,
            image: true,
            slug: true
          }
        })
        return {
          ...category,
          productCount: item._count.id,
          totalSales: item._sum.salesCount || 0
        }
      })
    )

    // Process revenue chart data
    const revenueByDay = revenueChart.reduce((acc: any, order: any) => {
      const date = order.createdAt.toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + order.total
      return acc
    }, {})

    const chartData = Object.entries(revenueByDay).map(([date, revenue]) => ({
      date,
      revenue
    }))

    // Calculate growth percentages
    const monthlyGrowth = lastMonthRevenue._sum.total 
      ? ((monthlyRevenue._sum.total || 0) - (lastMonthRevenue._sum.total || 0)) / (lastMonthRevenue._sum.total || 1) * 100
      : 0

    console.log('=== DASHBOARD API - SUMMARY ===')
    console.log('Total Revenue:', totalRevenue._sum.total || 0)
    console.log('Total Orders:', totalOrders)
    console.log('Top Products Count:', topProductsWithDetails.length)
    console.log('=== END DASHBOARD API ===')

    const dashboardData = {
      // Key Metrics
      totalRevenue: totalRevenue._sum.total || 0,
      totalOrders: totalOrders,
      totalCustomers: totalCustomers,
      totalProducts: totalProducts,
      
      // This Month Stats
      monthlyRevenue: monthlyRevenue._sum.total || 0,
      weeklyRevenue: weeklyRevenue._sum.total || 0,
      monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
      newCustomersThisMonth,
      newCustomersThisWeek,
      
      // Product Stats
      activeProducts,
      featuredProducts,
      lowStockProducts,
      outOfStockProducts,
      
      // Order Status
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      ordersByStatus,
      
      // Payment & Refunds
      paidOrders,
      failedPayments,
      pendingRefunds,
      totalRefunded: totalRefunded._sum.amount || 0,
      
      // Recent Activity
      recentOrders,
      recentRefunds,
      recentInventoryChanges,
      recentOrderNotes,
      
      // Top Performers - ✅ NOW SHOWING REAL SALES DATA
      topSellingProducts: topProductsWithDetails,
      topCustomers: topCustomersWithDetails,
      topBrands: topBrandsWithDetails,
      topCategories: topCategoriesWithDetails,
      
      // Charts Data
      revenueChart: chartData,
      orderSourceStats,
      paymentProviderStats,
      
      // Reviews
      totalReviews,
      averageRating: averageRating._avg.rating || 0,
      recentReviews,
      
      // Coupons
      activeCoupons,
      expiringSoonCoupons,
      
      // Additional metrics
      averageOrderValue: totalOrders > 0 ? (totalRevenue._sum.total || 0) / totalOrders : 0,
      conversionRate: 85.5,
      refundRate: totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0,
      
      // Meta info
      meta: {
        hasSalesData: topProductsWithDetails.length > 0,
        validOrdersCount: validOrderIds.length
      }
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('❌ Error fetching dashboard data:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch dashboard data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}