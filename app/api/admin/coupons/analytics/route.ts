// ============================================
// FILE 5: app/api/admin/coupons/analytics/route.ts
// NEW: Comprehensive coupon analytics
// ============================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const [
      totalCoupons,
      activeCoupons,
      recentUsages,
      topCoupons,
      conversionData
    ] = await Promise.all([
      // Total coupons
      prisma.coupon.count({
        where: { deletedAt: null }
      }),

      // Active coupons
      prisma.coupon.count({
        where: {
          deletedAt: null,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      }),

      // Recent usage trend
      prisma.couponUsage.groupBy({
        by: ['usedAt'],
        where: {
          usedAt: { gte: startDate }
        },
        _count: true,
        _sum: { discount: true },
        orderBy: { usedAt: 'asc' }
      }),

      // Top performing coupons
      prisma.coupon.findMany({
        where: {
          deletedAt: null,
          usedCount: { gt: 0 }
        },
        include: {
          _count: {
            select: { usages: true }
          },
          usages: {
            select: { discount: true }
          }
        },
        orderBy: { usedCount: 'desc' },
        take: 10
      }),

      // Conversion metrics
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startDate },
          couponId: { not: null },
          paymentStatus: 'PAID'
        },
        _count: true,
        _sum: {
          total: true,
          discount: true,
          subtotal: true
        }
      })
    ])

    // Calculate metrics
    const totalRevenue = conversionData._sum.total || 0
    const totalDiscount = conversionData._sum.discount || 0
    const totalSubtotal = conversionData._sum.subtotal || 0
    const ordersWithCoupons = conversionData._count

    const topPerformers = topCoupons.map(coupon => ({
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      usedCount: coupon.usedCount,
      totalDiscount: coupon.usages.reduce((sum, u) => sum + u.discount, 0),
      averageDiscount: coupon.usages.length > 0
        ? coupon.usages.reduce((sum, u) => sum + u.discount, 0) / coupon.usages.length
        : 0
    }))

    return NextResponse.json({
      overview: {
        totalCoupons,
        activeCoupons,
        inactiveCoupons: totalCoupons - activeCoupons,
        ordersWithCoupons
      },
      performance: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        averageDiscount: ordersWithCoupons > 0 
          ? Math.round((totalDiscount / ordersWithCoupons) * 100) / 100 
          : 0,
        discountRate: totalSubtotal > 0 
          ? Math.round((totalDiscount / totalSubtotal) * 100) 
          : 0,
        roi: totalDiscount > 0
          ? Math.round(((totalRevenue - totalDiscount) / totalDiscount) * 100)
          : 0
      },
      topPerformers,
      trends: recentUsages.map(usage => ({
        date: usage.usedAt,
        count: usage._count,
        totalDiscount: usage._sum.discount || 0
      })),
      period: {
        days,
        startDate,
        endDate: new Date()
      }
    })

  } catch (error) {
    console.error('Error fetching coupon analytics:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch analytics'
    }, { status: 500 })
  }
}
