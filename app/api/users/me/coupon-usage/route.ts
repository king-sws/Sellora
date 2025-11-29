// ============================================
// FILE 4: app/api/users/me/coupon-usage/route.ts
// NEW: Get user's coupon usage history
// ============================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const [usages, total] = await Promise.all([
      prisma.couponUsage.findMany({
        where: { userId: session.user.id },
        include: {
          coupon: {
            select: {
              id: true,
              code: true,
              type: true,
              value: true,
              description: true,
              isActive: true,
              expiresAt: true
            }
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              subtotal: true,
              status: true,
              createdAt: true
            }
          }
        },
        orderBy: { usedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.couponUsage.count({
        where: { userId: session.user.id }
      })
    ])

    // Calculate statistics
    const totalSavings = usages.reduce((sum, usage) => sum + usage.discount, 0)
    const uniqueCoupons = new Set(usages.map(u => u.couponId)).size

    return NextResponse.json({
      usages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      statistics: {
        totalUsages: total,
        uniqueCouponsUsed: uniqueCoupons,
        totalSavings: Math.round(totalSavings * 100) / 100,
        averageSavings: total > 0 ? Math.round((totalSavings / total) * 100) / 100 : 0
      }
    })

  } catch (error) {
    console.error('Error fetching coupon usage:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch coupon usage history'
    }, { status: 500 })
  }
}
