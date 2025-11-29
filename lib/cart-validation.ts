// lib/cart-validation.ts
import { prisma } from '@/db/prisma'

export interface CartValidationResult {
  isValid: boolean
  errors: CartValidationError[]
  warnings: CartValidationWarning[]
  adjustments: CartAdjustment[]
}

export interface CartValidationError {
  itemId: string
  productId: string
  productName: string
  type: 'out_of_stock' | 'product_unavailable' | 'variant_unavailable' | 'price_changed'
  message: string
}

export interface CartValidationWarning {
  itemId: string
  productId: string
  productName: string
  type: 'limited_stock' | 'price_increase' | 'price_decrease'
  message: string
  oldValue?: number
  newValue?: number
}

export interface CartAdjustment {
  itemId: string
  productId: string
  field: 'quantity' | 'price'
  oldValue: number
  newValue: number
  reason: string
}

/**
 * Validates all items in a user's cart before checkout
 * Checks stock availability, product status, and pricing
 */
export async function validateCart(userId: string): Promise<CartValidationResult> {
  const errors: CartValidationError[] = []
  const warnings: CartValidationWarning[] = []
  const adjustments: CartAdjustment[] = []

  try {
    // Fetch all cart items with product details
    const cartItems = await prisma.cartItem.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            comparePrice: true,
            stock: true,
            isActive: true,
            deletedAt: true
          }
        },
        variant: {
          select: {
            id: true,
            name: true,
            price: true,
            comparePrice: true,
            stock: true,
            isActive: true
          }
        }
      }
    })

    for (const item of cartItems) {
      const product = item.product
      const variant = item.variant

      // Check if product is deleted or inactive
      if (product.deletedAt || !product.isActive) {
        errors.push({
          itemId: item.id,
          productId: product.id,
          productName: product.name,
          type: 'product_unavailable',
          message: `${product.name} is no longer available`
        })
        continue
      }

      // Check if variant is inactive
      if (item.variantId && variant && !variant.isActive) {
        errors.push({
          itemId: item.id,
          productId: product.id,
          productName: product.name,
          type: 'variant_unavailable',
          message: `${product.name} (${variant.name}) is no longer available`
        })
        continue
      }

      // Determine effective stock and price
      const effectiveStock = variant?.stock ?? product.stock
      const currentPrice = variant?.price ?? product.price
      const currentComparePrice = variant?.comparePrice ?? product.comparePrice
      const effectivePrice = currentComparePrice && currentComparePrice < currentPrice
        ? currentComparePrice
        : currentPrice

      // Check stock availability
      if (effectiveStock === 0) {
        errors.push({
          itemId: item.id,
          productId: product.id,
          productName: product.name,
          type: 'out_of_stock',
          message: `${product.name} is out of stock`
        })
        continue
      }

      // Check if quantity exceeds stock
      if (item.quantity > effectiveStock) {
        warnings.push({
          itemId: item.id,
          productId: product.id,
          productName: product.name,
          type: 'limited_stock',
          message: `Only ${effectiveStock} of ${product.name} available`,
          oldValue: item.quantity,
          newValue: effectiveStock
        })

        adjustments.push({
          itemId: item.id,
          productId: product.id,
          field: 'quantity',
          oldValue: item.quantity,
          newValue: effectiveStock,
          reason: 'Stock limitation'
        })
      }

      // Warn about low stock
      if (effectiveStock <= 5 && item.quantity <= effectiveStock) {
        warnings.push({
          itemId: item.id,
          productId: product.id,
          productName: product.name,
          type: 'limited_stock',
          message: `Only ${effectiveStock} of ${product.name} left in stock`
        })
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      adjustments
    }
  } catch (error) {
    console.error('Cart validation error:', error)
    throw new Error('Failed to validate cart')
  }
}

/**
 * Apply cart adjustments (update quantities based on stock)
 */
export async function applyCartAdjustments(
  adjustments: CartAdjustment[]
): Promise<{ success: boolean; applied: number }> {
  let applied = 0

  try {
    for (const adjustment of adjustments) {
      if (adjustment.field === 'quantity') {
        await prisma.cartItem.update({
          where: { id: adjustment.itemId },
          data: { 
            quantity: adjustment.newValue,
            updatedAt: new Date()
          }
        })
        applied++
      }
    }

    return { success: true, applied }
  } catch (error) {
    console.error('Error applying cart adjustments:', error)
    return { success: false, applied }
  }
}

/**
 * Remove invalid cart items (out of stock, unavailable products)
 */
export async function removeInvalidCartItems(
  errors: CartValidationError[]
): Promise<{ success: boolean; removed: number }> {
  const itemIds = errors.map(e => e.itemId)

  try {
    const result = await prisma.cartItem.deleteMany({
      where: {
        id: { in: itemIds }
      }
    })

    return { success: true, removed: result.count }
  } catch (error) {
    console.error('Error removing invalid cart items:', error)
    return { success: false, removed: 0 }
  }
}

/**
 * Clean up expired cart items (run as background job)
 */
export async function cleanupExpiredCartItems(): Promise<number> {
  try {
    const result = await prisma.cartItem.deleteMany({
      where: {
        expiresAt: {
          lte: new Date()
        }
      }
    })

    return result.count
  } catch (error) {
    console.error('Error cleaning up expired cart items:', error)
    return 0
  }
}

/**
 * Calculate cart metrics for analytics
 */
export async function calculateCartMetrics(userId: string) {
  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: {
      product: {
        select: {
          price: true,
          comparePrice: true
        }
      },
      variant: {
        select: {
          price: true,
          comparePrice: true
        }
      }
    }
  })

  let subtotal = 0
  let totalSavings = 0
  let itemCount = 0

  for (const item of cartItems) {
    const basePrice = item.variant?.price ?? item.product.price
    const comparePrice = item.variant?.comparePrice ?? item.product.comparePrice
    const effectivePrice = comparePrice && comparePrice < basePrice ? comparePrice : basePrice
    
    subtotal += effectivePrice * item.quantity
    itemCount += item.quantity

    if (comparePrice && comparePrice < basePrice) {
      totalSavings += (basePrice - comparePrice) * item.quantity
    }
  }

  return {
    itemCount,
    subtotal: Math.round(subtotal * 100) / 100,
    totalSavings: Math.round(totalSavings * 100) / 100,
    averageItemValue: itemCount > 0 ? Math.round((subtotal / itemCount) * 100) / 100 : 0
  }
}