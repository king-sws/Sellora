// app/api/admin/sidebar-stats/route.ts (Updated to work with your structure)
import { NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get real-time counts for sidebar badges
    const [
      pendingOrders,
      lowStockProducts,
      outOfStockProducts,
      totalReviews,
      unreadReviews,
      totalCustomers,
      newCustomersToday,
      totalOrders,
      totalProducts
    ] = await Promise.all([
      // Pending orders count
      prisma.order.count({
        where: { status: 'PENDING' }
      }),
      
      // Low stock products (stock <= 10 and > 0)
      prisma.product.count({
        where: {
          stock: { lte: 10, gt: 0 },
          isActive: true,
          deletedAt: null
        }
      }),
      
      // Out of stock products
      prisma.product.count({
        where: {
          stock: 0,
          isActive: true,
          deletedAt: null
        }
      }),
      
      // Total reviews
      prisma.review.count(),
      
      // Unverified reviews (assuming unread/new reviews)
      prisma.review.count({
        where: { isVerified: false }
      }),
      
      // Total customers
      prisma.user.count({
        where: { role: 'USER' }
      }),
      
      // New customers today
      prisma.user.count({
        where: {
          role: 'USER',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),

      // Total orders
      prisma.order.count(),

      // Total products
      prisma.product.count({ 
        where: { deletedAt: null } 
      })
    ])

    const stats = {
      orders: {
        pending: pendingOrders,
        total: totalOrders
      },
      products: {
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
        total: totalProducts
      },
      reviews: {
        unread: unreadReviews,
        total: totalReviews
      },
      customers: {
        total: totalCustomers,
        newToday: newCustomersToday
      }
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching sidebar stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}