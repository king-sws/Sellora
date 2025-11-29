
// app/api/admin/refunds/[id]/process/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'


export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const refund = await prisma.refund.findUnique({
      where: { id: params.id },
      include: {
        order: {
          include: {
            items: true
          }
        }
      }
    })

    if (!refund) {
      return NextResponse.json({ error: 'Refund not found' }, { status: 404 })
    }

    if (refund.status !== 'APPROVED') {
      return NextResponse.json({ 
        error: 'Only approved refunds can be processed' 
      }, { status: 400 })
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update refund status
      const updatedRefund = await tx.refund.update({
        where: { id: params.id },
        data: {
          status: 'PROCESSED',
          processedAt: new Date()
        }
      })

      // Update order status to REFUNDED
      await tx.order.update({
        where: { id: refund.orderId },
        data: {
          status: 'REFUNDED',
          paymentStatus: 'REFUNDED'
        }
      })

      // Create order status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: refund.orderId,
          fromStatus: refund.order.status,
          toStatus: 'REFUNDED',
          changedBy: session.user.id,
          reason: `Refund processed: ${updatedRefund.refundId || updatedRefund.id}`
        }
      })

      // Restore inventory for refunded items
      for (const item of refund.order.items) {
        if (item.variantId) {
          // Update variant stock
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            select: { stock: true }
          })

          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              stock: (variant?.stock || 0) + item.quantity
            }
          })

          // Create inventory log
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              variantId: item.variantId,
              changeAmount: item.quantity,
              newStock: (variant?.stock || 0) + item.quantity,
              reason: 'RETURN',
              referenceId: refund.orderId,
              notes: `Refund processed for order #${refund.order.orderNumber}`,
              changedByUserId: session.user.id
            }
          })
        } else {
          // Update product stock
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true }
          })

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: (product?.stock || 0) + item.quantity
            }
          })

          // Create inventory log
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              changeAmount: item.quantity,
              newStock: (product?.stock || 0) + item.quantity,
              reason: 'RETURN',
              referenceId: refund.orderId,
              notes: `Refund processed for order #${refund.order.orderNumber}`,
              changedByUserId: session.user.id
            }
          })
        }
      }

      return updatedRefund
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error processing refund:', error)
    return NextResponse.json({ 
      error: 'Failed to process refund',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}