// ============================================
// FILE: app/api/admin/coupons/[id]/route.ts
// ============================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'
import { Prisma } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const coupon = await prisma.coupon.findUnique({
      where: { id: params.id },
      include: {
        orders: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            discount: true,
            subtotal: true,
            createdAt: true,
            status: true,
            paymentStatus: true,
            user: {
              select: { 
                id: true,
                name: true, 
                email: true 
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 100
        }
      }
    })

    if (!coupon || coupon.deletedAt) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    // Calculate comprehensive usage statistics
    const paidOrders = coupon.orders.filter(order => order.paymentStatus === 'PAID')
    const totalRevenue = paidOrders.reduce((sum, order) => sum + order.total, 0)
    const totalDiscount = paidOrders.reduce((sum, order) => sum + order.discount, 0)
    const totalSubtotal = paidOrders.reduce((sum, order) => sum + order.subtotal, 0)

    // Calculate usage by status
    const statusBreakdown = coupon.orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calculate time-based metrics
    const last30Days = new Date()
    last30Days.setDate(last30Days.getDate() - 30)
    
    const recentOrders = coupon.orders.filter(
      order => new Date(order.createdAt) >= last30Days
    )

    // Calculate redemption rate
    const redemptionRate = coupon.maxUses 
      ? Math.round((coupon.usedCount / coupon.maxUses) * 100) 
      : null

    // Calculate average discount per order
    const avgDiscountPerOrder = paidOrders.length > 0
      ? totalDiscount / paidOrders.length
      : 0

    // Determine coupon status
    const now = new Date()
    let couponStatus = 'active'
    if (!coupon.isActive) {
      couponStatus = 'inactive'
    } else if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
      couponStatus = 'expired'
    } else if (coupon.startsAt && new Date(coupon.startsAt) > now) {
      couponStatus = 'scheduled'
    } else if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      couponStatus = 'depleted'
    }

    return NextResponse.json({
      coupon: {
        ...coupon,
        status: couponStatus
      },
      usage: {
        orders: coupon.orders,
        totalOrders: coupon.orders.length,
        paidOrders: paidOrders.length,
        totalRevenue,
        totalDiscount,
        totalSubtotal,
        averageOrderValue: paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0,
        averageDiscountPerOrder: avgDiscountPerOrder,
        statusBreakdown,
        last30DaysOrders: recentOrders.length,
        redemptionRate,
        remainingUses: coupon.maxUses ? Math.max(0, coupon.maxUses - coupon.usedCount) : null
      },
      metrics: {
        conversionValue: totalRevenue - totalDiscount,
        discountPercentage: totalSubtotal > 0 
          ? Math.round((totalDiscount / totalSubtotal) * 100) 
          : 0,
        roi: totalDiscount > 0 
          ? Math.round(((totalRevenue - totalDiscount) / totalDiscount) * 100) 
          : 0
      }
    })
  } catch (error) {
    console.error('Error fetching coupon:', error)
    return NextResponse.json({ error: 'Failed to fetch coupon' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Validation
    const errors: string[] = []

    if (data.code && !/^[A-Z0-9_-]+$/i.test(data.code)) {
      errors.push('Code can only contain letters, numbers, hyphens, and underscores')
    }

    if (data.type && !['PERCENTAGE', 'FIXED_AMOUNT'].includes(data.type)) {
      errors.push('Invalid coupon type')
    }

    if (data.value !== undefined) {
      const value = parseFloat(data.value)
      if (isNaN(value) || value <= 0) {
        errors.push('Value must be greater than 0')
      }
      if (data.type === 'PERCENTAGE' && value > 100) {
        errors.push('Percentage value cannot exceed 100')
      }
    }

    if (data.minAmount !== undefined && data.minAmount !== null) {
      const minAmount = parseFloat(data.minAmount)
      if (isNaN(minAmount) || minAmount < 0) {
        errors.push('Minimum amount cannot be negative')
      }
    }

    if (data.maxUses !== undefined && data.maxUses !== null) {
      const maxUses = parseInt(data.maxUses)
      if (isNaN(maxUses) || maxUses < 1) {
        errors.push('Maximum uses must be at least 1')
      }
    }

    if (data.startsAt && data.expiresAt) {
      if (new Date(data.startsAt) >= new Date(data.expiresAt)) {
        errors.push('Start date must be before expiration date')
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 })
    }

    // Check for duplicate code if code is being changed
    if (data.code) {
      const existing = await prisma.coupon.findFirst({
        where: { 
          code: data.code.toUpperCase(),
          deletedAt: null,
          NOT: { id: params.id }
        }
      })

      if (existing) {
        return NextResponse.json({ 
          error: 'A coupon with this code already exists' 
        }, { status: 400 })
      }
    }

    // Build update data
    const updateData: Prisma.CouponUpdateInput = {
      updatedAt: new Date()
    }

    if (data.code !== undefined) updateData.code = data.code.toUpperCase()
    if (data.description !== undefined) updateData.description = data.description || null
    if (data.type !== undefined) updateData.type = data.type
    if (data.value !== undefined) updateData.value = parseFloat(data.value)
    if (data.minAmount !== undefined) {
      updateData.minAmount = data.minAmount ? parseFloat(data.minAmount) : null
    }
    if (data.maxUses !== undefined) {
      updateData.maxUses = data.maxUses ? parseInt(data.maxUses) : null
    }
    if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive)
    if (data.startsAt !== undefined) {
      updateData.startsAt = data.startsAt ? new Date(data.startsAt) : null
    }
    if (data.expiresAt !== undefined) {
      updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null
    }

    const coupon = await prisma.coupon.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json(coupon)
  } catch (error) {
    console.error('Error updating coupon:', error)
    return NextResponse.json({ 
      error: 'Failed to update coupon',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if coupon exists
    const coupon = await prisma.coupon.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { orders: true }
        }
      }
    })

    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    // Soft delete
    await prisma.coupon.update({
      where: { id: params.id },
      data: { 
        deletedAt: new Date(),
        isActive: false
      }
    })

    return NextResponse.json({ 
      message: 'Coupon deleted successfully',
      ordersAffected: coupon._count.orders
    })
  } catch (error) {
    console.error('Error deleting coupon:', error)
    return NextResponse.json({ 
      error: 'Failed to delete coupon',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}