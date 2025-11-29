// ============================================
// FILE 1: lib/coupon-validator.ts
// NEW: Centralized validation logic
// ============================================
import { Coupon, PrismaClient } from '@prisma/client'

export interface CouponValidationParams {
  couponCode: string
  userId: string
  orderAmount: number
  currentDate?: Date
}

export interface CouponValidationResult {
  valid: boolean
  coupon?: Coupon
  discount?: number
  message: string
  details?: {
    newTotal?: number
    savingsPercentage?: number
    requiredAmount?: number
    currentAmount?: number
    shortfall?: number
    remainingUses?: number | null
    userUsesRemaining?: number | null
  }
}

/**
 * Centralized coupon validation
 * Use this in BOTH validation endpoint AND order creation
 * Ensures 100% consistency across your application
 */
export async function validateCoupon(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma: PrismaClient | any, // Works with both regular Prisma and transactions
  params: CouponValidationParams
): Promise<CouponValidationResult> {
  const { couponCode, userId, orderAmount, currentDate = new Date() } = params
  
  // Step 1: Find active coupon (case-insensitive)
  const coupon = await prisma.coupon.findFirst({
    where: {
      code: {
        equals: couponCode.toUpperCase().trim(),
        mode: 'insensitive'
      },
      deletedAt: null,
      isActive: true
    }
  })

  if (!coupon) {
    return {
      valid: false,
      message: 'Invalid or inactive coupon code'
    }
  }

  // Step 2: Check start date
  if (coupon.startsAt && new Date(coupon.startsAt) > currentDate) {
    return {
      valid: false,
      message: `This coupon will be active from ${new Date(coupon.startsAt).toLocaleDateString()}`
    }
  }

  // Step 3: Check expiry (end-of-day logic - consistent everywhere)
  if (coupon.expiresAt) {
    const expiryEndOfDay = new Date(coupon.expiresAt)
    expiryEndOfDay.setHours(23, 59, 59, 999)
    
    if (expiryEndOfDay < currentDate) {
      return {
        valid: false,
        message: 'This coupon has expired'
      }
    }
  }

  // Step 4: Check global usage limit
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return {
      valid: false,
      message: 'This coupon has reached its maximum usage limit',
      details: {
        remainingUses: 0
      }
    }
  }

  // Step 5: Check per-user usage limit
  let userUsageCount = 0
  if (coupon.maxUsesPerUser) {
    userUsageCount = await prisma.couponUsage.count({
      where: {
        couponId: coupon.id,
        userId: userId
      }
    })

    if (userUsageCount >= coupon.maxUsesPerUser) {
      return {
        valid: false,
        message: `You have already used this coupon ${userUsageCount} time(s). Maximum ${coupon.maxUsesPerUser} uses allowed per customer.`,
        details: {
          userUsesRemaining: 0
        }
      }
    }
  }

  // Step 6: Check minimum order amount
  if (coupon.minAmount && orderAmount < coupon.minAmount) {
    const shortfall = coupon.minAmount - orderAmount
    return {
      valid: false,
      message: `Minimum order amount of $${coupon.minAmount.toFixed(2)} required to use this coupon`,
      details: {
        requiredAmount: coupon.minAmount,
        currentAmount: orderAmount,
        shortfall: shortfall
      }
    }
  }

  // Step 7: Calculate discount (consistent formula)
  let discount = 0
  if (coupon.type === 'PERCENTAGE') {
    discount = (orderAmount * coupon.value) / 100
  } else if (coupon.type === 'FIXED_AMOUNT') {
    discount = coupon.value
  }

  // Cap discount at order amount and round once
  discount = Math.min(discount, orderAmount)
  discount = Math.round(discount * 100) / 100

  const newTotal = Math.max(0, Math.round((orderAmount - discount) * 100) / 100)
  const savingsPercentage = orderAmount > 0 ? Math.round((discount / orderAmount) * 100) : 0

  return {
    valid: true,
    coupon,
    discount,
    message: `Coupon applied successfully! You saved $${discount.toFixed(2)} (${savingsPercentage}%)`,
    details: {
      newTotal,
      savingsPercentage,
      remainingUses: coupon.maxUses ? Math.max(0, coupon.maxUses - coupon.usedCount) : null,
      userUsesRemaining: coupon.maxUsesPerUser 
        ? Math.max(0, coupon.maxUsesPerUser - userUsageCount)
        : null
    }
  }
}