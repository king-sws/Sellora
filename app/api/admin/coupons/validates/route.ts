// ============================================
// FILE: app/api/admin/coupons/validate/route.ts
// ============================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code, orderAmount } = await request.json()

    // Validation
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ 
        valid: false,
        message: 'Coupon code is required' 
      }, { status: 400 })
    }

    if (!orderAmount || typeof orderAmount !== 'number' || orderAmount <= 0) {
      return NextResponse.json({ 
        valid: false,
        message: 'Valid order amount is required' 
      }, { status: 400 })
    }

    // Find coupon
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase().trim(),
        deletedAt: null,
        isActive: true
      }
    })

    if (!coupon) {
      return NextResponse.json({
        valid: false,
        message: 'Invalid or inactive coupon code'
      }, { status: 200 })
    }

    const now = new Date()

    // Check if coupon has started
    if (coupon.startsAt && new Date(coupon.startsAt) > now) {
      return NextResponse.json({
        valid: false,
        message: `This coupon will be active from ${new Date(coupon.startsAt).toLocaleDateString()}`
      }, { status: 200 })
    }

    // Check if coupon has expired
    if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
      return NextResponse.json({
        valid: false,
        message: 'This coupon has expired'
      }, { status: 200 })
    }

    // Check usage limit
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({
        valid: false,
        message: 'This coupon has reached its maximum usage limit'
      }, { status: 200 })
    }

    // Check minimum amount requirement
    if (coupon.minAmount && orderAmount < coupon.minAmount) {
      return NextResponse.json({
        valid: false,
        message: `Minimum order amount of $${coupon.minAmount.toFixed(2)} required to use this coupon`
      }, { status: 200 })
    }

    // Calculate discount
    let discount = 0
    if (coupon.type === 'PERCENTAGE') {
      discount = Math.round((orderAmount * coupon.value / 100) * 100) / 100
    } else if (coupon.type === 'FIXED_AMOUNT') {
      discount = coupon.value
    }

    // Ensure discount doesn't exceed order total
    discount = Math.min(discount, orderAmount)
    discount = Math.round(discount * 100) / 100

    const newTotal = Math.max(0, Math.round((orderAmount - discount) * 100) / 100)

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        description: coupon.description
      },
      discount,
      newTotal,
      message: `Coupon applied successfully! You saved $${discount.toFixed(2)}`
    })

  } catch (error) {
    console.error('Error validating coupon:', error)
    return NextResponse.json({ 
      valid: false,
      message: 'Failed to validate coupon. Please try again.' 
    }, { status: 500 })
  }
}