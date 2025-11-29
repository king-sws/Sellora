// lib/inventory.ts - Centralized inventory management
import { prisma } from '@/db/prisma'
import { Prisma } from '@prisma/client'

export type InventoryReason = Prisma.$Enums.InventoryReason

interface UpdateInventoryParams {
  productId: string
  variantId?: string | null
  changeAmount: number
  reason: InventoryReason
  notes?: string
  changedByUserId: string
  referenceId?: string // Order ID, etc.
}

/**
 * Central function to update inventory and create audit log
 * This ensures consistency across the application
 */
export async function updateInventory(
  params: UpdateInventoryParams,
  tx?: Prisma.TransactionClient
) {
  const prismaClient = tx || prisma

  try {
    // Determine what to update
    const isVariant = !!params.variantId
    
    // Get current stock
    const currentStock = isVariant
      ? await prismaClient.productVariant.findUnique({
          where: { id: params.variantId! },
          select: { stock: true }
        })
      : await prismaClient.product.findUnique({
          where: { id: params.productId },
          select: { stock: true }
        })

    if (!currentStock) {
      throw new Error(`${isVariant ? 'Variant' : 'Product'} not found`)
    }

    const newStock = currentStock.stock + params.changeAmount

    // Prevent negative stock
    if (newStock < 0) {
      throw new Error('Insufficient stock')
    }

    // Update stock
    if (isVariant) {
      await prismaClient.productVariant.update({
        where: { id: params.variantId! },
        data: { stock: newStock }
      })
    } else {
      await prismaClient.product.update({
        where: { id: params.productId },
        data: { stock: newStock }
      })
    }

    // Create inventory log
    await prismaClient.inventoryLog.create({
      data: {
        productId: params.productId,
        variantId: params.variantId,
        changeAmount: params.changeAmount,
        newStock: newStock,
        reason: params.reason,
        notes: params.notes || '',
        referenceId: params.referenceId,
        changedByUserId: params.changedByUserId
      }
    })

    return { success: true, newStock }
  } catch (error) {
    console.error('Inventory update failed:', error)
    throw error
  }
}

/**
 * Get low stock products/variants
 */
export async function getLowStockItems(threshold: number = 10) {
  const [lowStockProducts, lowStockVariants] = await Promise.all([
    prisma.product.findMany({
      where: {
        stock: { gt: 0, lte: threshold },
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true
      }
    }),
    prisma.productVariant.findMany({
      where: {
        stock: { gt: 0, lte: threshold },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        product: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
  ])

  return { lowStockProducts, lowStockVariants }
}

/**
 * Get out of stock items
 */
export async function getOutOfStockItems() {
  const [outOfStockProducts, outOfStockVariants] = await Promise.all([
    prisma.product.findMany({
      where: {
        stock: 0,
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        sku: true
      }
    }),
    prisma.productVariant.findMany({
      where: {
        stock: 0,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        sku: true,
        product: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
  ])

  return { outOfStockProducts, outOfStockVariants }
}

/**
 * Reserve inventory for an order (called when order is created)
 */
export async function reserveInventory(
  orderItems: Array<{
    productId: string
    variantId?: string | null
    quantity: number
  }>,
  orderId: string,
  userId: string
) {
  return await prisma.$transaction(async (tx) => {
    const results = []

    for (const item of orderItems) {
      const result = await updateInventory({
        productId: item.productId,
        variantId: item.variantId,
        changeAmount: -item.quantity,
        reason: 'SALE',
        notes: `Reserved for order ${orderId}`,
        changedByUserId: userId,
        referenceId: orderId
      }, tx)

      results.push(result)
    }

    return results
  })
}

/**
 * Return inventory when order is cancelled/refunded
 */
export async function returnInventory(
  orderItems: Array<{
    productId: string
    variantId?: string | null
    quantity: number
  }>,
  orderId: string,
  userId: string,
  reason: 'RETURN' | 'CANCELLATION' = 'RETURN'
) {
  return await prisma.$transaction(async (tx) => {
    const results = []

    for (const item of orderItems) {
      const result = await updateInventory({
        productId: item.productId,
        variantId: item.variantId,
        changeAmount: item.quantity, // Positive to add back
        reason: reason,
        notes: `Returned from order ${orderId}`,
        changedByUserId: userId,
        referenceId: orderId
      }, tx)

      results.push(result)
    }

    return results
  })
}