// ============================================
// FILE 2: app/api/coupons/validate/route.ts
// UPDATED: Use centralized validation
// ============================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'
import { z } from 'zod'
import { validateCoupon } from '@/lib/coupon-validator'

// Rate limiting (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

const validateSchema = z.object({
  code: z.string().min(1, 'Coupon code is required').trim(),
  orderAmount: z.number().positive('Order amount must be greater than 0')
})

function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const key = `coupon_validate:${userId}`
  const limit = rateLimitMap.get(key)

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60000 })
    return { allowed: true }
  }

  if (limit.count >= 10) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((limit.resetAt - now) / 1000) 
    }
  }

  limit.count++
  return { allowed: true }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        valid: false,
        message: 'Please sign in to use coupons' 
      }, { status: 401 })
    }

    // Rate limiting
    const rateCheck = checkRateLimit(session.user.id)
    if (!rateCheck.allowed) {
      return NextResponse.json({
        valid: false,
        message: `Too many validation attempts. Please try again in ${rateCheck.retryAfter} seconds.`
      }, { status: 429 })
    }

    // Validate request
    const body = await request.json()
    
    let validated
    try {
      validated = validateSchema.parse(body)
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json({
          valid: false,
          message: 'Invalid request data'
        }, { status: 400 })
      }
      throw validationError
    }

    // Use centralized validation
    const result = await validateCoupon(prisma, {
      couponCode: validated.code,
      userId: session.user.id,
      orderAmount: validated.orderAmount
    })

    if (!result.valid) {
      return NextResponse.json({
        valid: false,
        message: result.message,
        details: result.details
      }, { status: 200 })
    }

    // Add warning for high-demand coupons
    const warnings: string[] = []
    const remainingUses = result.details?.remainingUses
    if (result.coupon!.maxUses && typeof remainingUses === 'number') {
      if (remainingUses <= 5) {
        warnings.push(`Only ${remainingUses} uses remaining! Complete checkout quickly.`)
      }
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: result.coupon!.id,
        code: result.coupon!.code,
        type: result.coupon!.type,
        value: result.coupon!.value,
        description: result.coupon!.description || null,
        minAmount: result.coupon!.minAmount,
        expiresAt: result.coupon!.expiresAt
      },
      discount: result.discount,
      newTotal: result.details!.newTotal,
      originalTotal: validated.orderAmount,
      savingsPercentage: result.details!.savingsPercentage,
      message: result.message,
      warnings: warnings.length > 0 ? warnings : undefined,
      details: {
        hasUsageLimit: result.coupon!.maxUses !== null,
        remainingUses: result.details!.remainingUses,
        hasUserLimit: result.coupon!.maxUsesPerUser !== null,
        userUsesRemaining: result.details!.userUsesRemaining
      }
    })

  } catch (error) {
    console.error('Error validating coupon:', error)
    
    return NextResponse.json({
      valid: false,
      message: 'Failed to validate coupon. Please try again.',
      ...(process.env.NODE_ENV === 'development' && error instanceof Error && { 
        debug: error.message 
      })
    }, { status: 500 })
  }
}