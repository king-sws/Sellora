// ============================================
// FILE: app/api/admin/coupons/route.ts
// ============================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const search = searchParams.get('search')
    const status = searchParams.get('status') // 'active', 'expired', 'inactive'
    const type = searchParams.get('type') // 'PERCENTAGE', 'FIXED_AMOUNT'
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc'

    const skip = (page - 1) * limit
    const where: Prisma.CouponWhereInput = { deletedAt: null }

    // Search filter
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Status filter
    const now = new Date()
    if (status === 'active') {
      where.isActive = true
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: now } }
      ]
      where.AND = [
        {
          OR: [
            { startsAt: null },
            { startsAt: { lte: now } }
          ]
        }
      ]
    } else if (status === 'expired') {
      where.expiresAt = { lt: now }
    } else if (status === 'inactive') {
      where.isActive = false
    } else if (status === 'scheduled') {
      where.startsAt = { gt: now }
    }

    // Type filter
    if (type && (type === 'PERCENTAGE' || type === 'FIXED_AMOUNT')) {
      where.type = type
    }

    const orderBy: Prisma.CouponOrderByWithRelationInput = {}
    if (sortBy === 'code') orderBy.code = sortOrder
    else if (sortBy === 'value') orderBy.value = sortOrder
    else if (sortBy === 'usedCount') orderBy.usedCount = sortOrder
    else if (sortBy === 'expiresAt') orderBy.expiresAt = sortOrder
    else orderBy.createdAt = sortOrder

    const [coupons, total, stats] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy,
        skip,
        take: limit
      }),
      prisma.coupon.count({ where }),
      prisma.coupon.aggregate({
        where: { deletedAt: null },
        _count: { id: true },
        _sum: { usedCount: true, value: true }
      })
    ])

    // Calculate statistics
    const activeCoupons = await prisma.coupon.count({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }]
      }
    })

    const expiredCoupons = await prisma.coupon.count({
      where: { deletedAt: null, expiresAt: { lt: now } }
    })

    const scheduledCoupons = await prisma.coupon.count({
      where: { deletedAt: null, startsAt: { gt: now } }
    })

    // Expiring soon (within 7 days)
    const expiringSoon = await prisma.coupon.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        expiresAt: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        }
      },
      take: 10,
      orderBy: { expiresAt: 'asc' }
    })

    // Top performing coupons
    const topPerformers = await prisma.coupon.findMany({
      where: { deletedAt: null, usedCount: { gt: 0 } },
      orderBy: { usedCount: 'desc' },
      take: 10
    })

    return NextResponse.json({
      coupons,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      statistics: {
        total: stats._count.id,
        active: activeCoupons,
        expired: expiredCoupons,
        scheduled: scheduledCoupons,
        inactive: stats._count.id - activeCoupons - expiredCoupons - scheduledCoupons,
        totalUsed: stats._sum.usedCount || 0,
        expiringSoon: expiringSoon.length
      },
      insights: {
        expiringSoon,
        topPerformers
      }
    })
  } catch (error) {
    console.error('Error fetching coupons:', error)
    return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Validation
    const errors: string[] = []
    
    if (!data.code || typeof data.code !== 'string') {
      errors.push('Code is required')
    } else if (!/^[A-Z0-9_-]+$/i.test(data.code)) {
      errors.push('Code can only contain letters, numbers, hyphens, and underscores')
    }

    if (!data.type || !['PERCENTAGE', 'FIXED_AMOUNT'].includes(data.type)) {
      errors.push('Invalid coupon type')
    }

    if (!data.value || data.value <= 0) {
      errors.push('Value must be greater than 0')
    }

    if (data.type === 'PERCENTAGE' && data.value > 100) {
      errors.push('Percentage value cannot exceed 100')
    }

    if (data.minAmount && data.minAmount < 0) {
      errors.push('Minimum amount cannot be negative')
    }

    if (data.maxUses && data.maxUses < 1) {
      errors.push('Maximum uses must be at least 1')
    }

    if (data.startsAt && data.expiresAt && new Date(data.startsAt) >= new Date(data.expiresAt)) {
      errors.push('Start date must be before expiration date')
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 })
    }

    // Check for duplicate code
    const existing = await prisma.coupon.findFirst({
      where: { 
        code: data.code.toUpperCase(),
        deletedAt: null
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'A coupon with this code already exists' }, { status: 400 })
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        description: data.description || null,
        type: data.type,
        value: parseFloat(data.value),
        minAmount: data.minAmount ? parseFloat(data.minAmount) : null,
        maxUses: data.maxUses ? parseInt(data.maxUses) : null,
        isActive: data.isActive !== false,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
      }
    })

    return NextResponse.json(coupon, { status: 201 })
  } catch (error) {
    console.error('Error creating coupon:', error)
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 })
  }
}



