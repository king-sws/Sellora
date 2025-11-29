// lib/cart-utils.ts
import { prisma } from '@/db/prisma'
import { Prisma } from '@prisma/client'

export const CART_CONFIG = {
  CACHE_DURATION: 60, // seconds
  CART_ITEM_EXPIRY_DAYS: 30,
  MAX_CART_ITEMS: 100,
  MAX_QUANTITY_PER_ITEM: 99,
  MIN_QUANTITY: 1,
  FREE_SHIPPING_THRESHOLD: 50,
  TAX_RATE: 0.08,
  STANDARD_SHIPPING_COST: 9.99,
} as const

export const productSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  comparePrice: true,
  stock: true,
  sku: true,
  images: true,
  isActive: true,
  category: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.ProductSelect

export type CartProduct = Prisma.ProductGetPayload<{
  select: typeof productSelect
}>

export interface CartItemWithProduct {
  id: string
  quantity: number
  createdAt: Date
  variantId: string | null
  product: CartProduct
}

export interface CartCalculation {
  subtotal: number
  tax: number
  shipping: number
  discount: number
  total: number
  totalItems: number
}

/**
 * Calculate cart totals with proper rounding
 */
export function calculateCartTotals(
  items: CartItemWithProduct[],
  discountAmount: number = 0
): CartCalculation {
  let subtotal = 0
  let totalItems = 0

  for (const item of items) {
    const itemPrice = getEffectivePrice(item.product)
    const validQuantity = Math.min(item.quantity, item.product.stock)

    if (validQuantity > 0) {
      subtotal += itemPrice * validQuantity
      totalItems += validQuantity
    }
  }

  const shipping =
    subtotal >= CART_CONFIG.FREE_SHIPPING_THRESHOLD
      ? 0
      : CART_CONFIG.STANDARD_SHIPPING_COST

  const tax = subtotal * CART_CONFIG.TAX_RATE
  const total = subtotal + tax + shipping - discountAmount

  return {
    subtotal: roundPrice(subtotal),
    tax: roundPrice(tax),
    shipping: roundPrice(shipping),
    discount: roundPrice(discountAmount),
    total: roundPrice(total),
    totalItems,
  }
}

/**
 * Get the effective price (considering sale price)
 */
export function getEffectivePrice(product: CartProduct): number {
  if (product.comparePrice && product.comparePrice < product.price) {
    return product.comparePrice
  }
  return product.price
}

/**
 * Get sale price if applicable
 */
export function getSalePrice(product: CartProduct): number | undefined {
  if (product.comparePrice && product.comparePrice < product.price) {
    return product.comparePrice
  }
  return undefined
}

/**
 * Round price to 2 decimal places
 */
export function roundPrice(price: number): number {
  return Math.round(price * 100) / 100
}

/**
 * Validate cart item quantity
 */
export function validateQuantity(quantity: number): {
  valid: boolean
  error?: string
} {
  if (!Number.isInteger(quantity)) {
    return { valid: false, error: 'Quantity must be a whole number' }
  }

  if (quantity < CART_CONFIG.MIN_QUANTITY) {
    return {
      valid: false,
      error: `Quantity must be at least ${CART_CONFIG.MIN_QUANTITY}`,
    }
  }

  if (quantity > CART_CONFIG.MAX_QUANTITY_PER_ITEM) {
    return {
      valid: false,
      error: `Quantity cannot exceed ${CART_CONFIG.MAX_QUANTITY_PER_ITEM}`,
    }
  }

  return { valid: true }
}

/**
 * Check if product is available for purchase
 */
export function isProductAvailable(
  product: { isActive: boolean; deletedAt?: Date | null },
  stock?: number
): boolean {
  if (!product.isActive || product.deletedAt) {
    return false
  }

  if (stock !== undefined && stock <= 0) {
    return false
  }

  return true
}

/**
 * Clean up expired cart items for a user
 */
export async function cleanupExpiredCartItems(
  userId: string
): Promise<number> {
  const result = await prisma.cartItem.deleteMany({
    where: {
      userId,
      expiresAt: { lte: new Date() },
    },
  })

  return result.count
}

/**
 * Get cart items with validation
 */
export async function getValidCartItems(
  userId: string
): Promise<CartItemWithProduct[]> {
  const items = await prisma.cartItem.findMany({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      product: {
        isActive: true,
        deletedAt: null,
      },
    },
    select: {
      id: true,
      quantity: true,
      createdAt: true,
      variantId: true,
      product: {
        select: productSelect,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: CART_CONFIG.MAX_CART_ITEMS,
  })

  return items
}

/**
 * Validate stock availability
 */
export function validateStock(
  requestedQuantity: number,
  availableStock: number
): { valid: boolean; error?: string; availableStock: number } {
  if (availableStock === 0) {
    return {
      valid: false,
      error: 'Product is out of stock',
      availableStock: 0,
    }
  }

  if (requestedQuantity > availableStock) {
    return {
      valid: false,
      error: `Only ${availableStock} items available`,
      availableStock,
    }
  }

  return { valid: true, availableStock }
}

/**
 * Format cart item for response
 */
export function formatCartItem(item: CartItemWithProduct) {
  return {
    id: item.id,
    quantity: Math.min(item.quantity, item.product.stock),
    product: {
      ...item.product,
      salePrice: getSalePrice(item.product),
    },
    addedAt: item.createdAt.toISOString(),
  }
}

/**
 * Get cart item expiry date
 */
export function getCartItemExpiry(): Date {
  return new Date(
    Date.now() + CART_CONFIG.CART_ITEM_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  )
}

/**
 * Check if user has reached cart limit
 */
export async function hasReachedCartLimit(userId: string): Promise<boolean> {
  const count = await prisma.cartItem.count({
    where: { userId },
  })

  return count >= CART_CONFIG.MAX_CART_ITEMS
}

/**
 * Merge guest cart into user cart (useful after login)
 */
export async function mergeGuestCart(
  guestCartItems: Array<{
    productId: string
    variantId?: string | null
    quantity: number
  }>,
  userId: string
): Promise<{ merged: number; skipped: number }> {
  let merged = 0
  let skipped = 0

  for (const item of guestCartItems) {
    try {
      // Check if product exists and is available
      const product = await prisma.product.findFirst({
        where: {
          id: item.productId,
          isActive: true,
          deletedAt: null,
        },
        select: { id: true, stock: true },
      })

      if (!product || product.stock === 0) {
        skipped++
        continue
      }

      // Upsert cart item
      await prisma.cartItem.upsert({
        where: {
          userId_productId_variantId: {
            userId,
            productId: item.productId,
            variantId: item.variantId ?? '',
          },
        },
        update: {
          quantity: { increment: item.quantity },
          updatedAt: new Date(),
          expiresAt: getCartItemExpiry(),
        },
        create: {
          userId,
          productId: item.productId,
          variantId: item.variantId ?? '',
          quantity: Math.min(item.quantity, product.stock),
          expiresAt: getCartItemExpiry(),
        },
      })

      merged++
    } catch (error) {
      console.error('Error merging cart item:', error)
      skipped++
    }
  }

  return { merged, skipped }
}