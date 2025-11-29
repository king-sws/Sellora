// app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'
import { z } from 'zod'

// Validation schemas
const updateOrderSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']).optional(),
  paymentStatus: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
  estimatedDelivery: z.string().datetime().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  shippingMethodId: z.string().optional(),
  notes: z.array(z.object({
    content: z.string(),
    isInternal: z.boolean().default(false)
  })).optional()
})

const refundSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().optional()
})

// GET /api/orders/[id] - Get single order with coupon details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const whereClause = session.user.role === 'ADMIN' 
      ? { id: params.id, deletedAt: null }
      : { id: params.id, userId: session.user.id, deletedAt: null }

    const order = await prisma.order.findFirst({
      where: whereClause,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                slug: true,
                price: true,
                comparePrice: true,
                sku: true,
                category: {
                  select: {
                    name: true,
                    slug: true
                  }
                }
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true
          }
        },
        shippingAddress: true,
        shippingMethod: true,
        coupon: { // NEW: Include full coupon details
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
        statusHistory: {
          include: {
            changedByUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { timestamp: 'desc' }
        },
        refunds: {
          include: {
            requestedByUser: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        notes: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          where: session.user.role === 'ADMIN' 
            ? {} 
            : { isInternal: false },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Calculate metrics
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0)
    const averageItemPrice = order.items.length > 0 
      ? order.items.reduce((sum, item) => sum + item.price, 0) / order.items.length 
      : 0
    const totalRefunded = order.refunds
      .filter(r => r.status === 'PROCESSED')
      .reduce((sum, r) => sum + r.amount, 0)

    // NEW: Calculate coupon savings percentage
    const savingsPercentage = order.discount > 0 && order.subtotal > 0
      ? Math.round((order.discount / order.subtotal) * 100)
      : 0

    const enrichedOrder = {
      ...order,
      metrics: {
        totalItems,
        averageItemPrice,
        totalRefunded,
        savingsPercentage, // NEW
        finalPrice: order.total - totalRefunded
      }
    }

    return NextResponse.json(enrichedOrder)
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 })
  }
}

// PUT /api/orders/[id] - Update order
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateOrderSchema.parse(body)

    // Get current order
    const currentOrder = await prisma.order.findUnique({
      where: { id: params.id },
      select: { 
        status: true, 
        paymentStatus: true,
        priority: true,
        trackingNumber: true,
        couponId: true,
        discount: true
      }
    })

    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        updatedAt: new Date()
      }

      if (validatedData.status !== undefined) updateData.status = validatedData.status
      if (validatedData.paymentStatus !== undefined) updateData.paymentStatus = validatedData.paymentStatus
      if (validatedData.trackingNumber !== undefined) updateData.trackingNumber = validatedData.trackingNumber
      if (validatedData.trackingUrl !== undefined) updateData.trackingUrl = validatedData.trackingUrl
      if (validatedData.priority !== undefined) updateData.priority = validatedData.priority
      if (validatedData.shippingMethodId !== undefined) updateData.shippingMethodId = validatedData.shippingMethodId
      if (validatedData.estimatedDelivery !== undefined) {
        updateData.estimatedDelivery = new Date(validatedData.estimatedDelivery)
      }

      if (validatedData.status === 'DELIVERED' && currentOrder.status !== 'DELIVERED') {
        updateData.deliveredAt = new Date()
      }

      const updatedOrder = await tx.order.update({
        where: { id: params.id },
        data: updateData
      })

      // Create status history if status changed
      if (validatedData.status && validatedData.status !== currentOrder.status) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: params.id,
            fromStatus: currentOrder.status,
            toStatus: validatedData.status,
            changedBy: session.user.id,
            reason: body.statusChangeReason || null,
            metadata: {
              previousTrackingNumber: currentOrder.trackingNumber,
              newTrackingNumber: validatedData.trackingNumber,
              userAgent: request.headers.get('user-agent'),
              ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
            }
          }
        })
      }

      // Add notes if provided
      if (validatedData.notes && validatedData.notes.length > 0) {
        await Promise.all(
          validatedData.notes.map(note =>
            tx.orderNote.create({
              data: {
                orderId: params.id,
                content: note.content,
                isInternal: note.isInternal,
                authorId: session.user.id
              }
            })
          )
        )
      }

      // Return updated order with all relations including coupon
      return await tx.order.findUnique({
        where: { id: params.id },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                  slug: true,
                  price: true,
                  sku: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          shippingAddress: true,
          shippingMethod: true,
          coupon: {
            select: {
              id: true,
              code: true,
              type: true,
              value: true,
              description: true
            }
          },
          statusHistory: {
            include: {
              changedByUser: {
                select: {
                  name: true,
                  email: true
                }
              }
            },
            orderBy: { timestamp: 'desc' },
            take: 5
          }
        }
      })
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues
      }, { status: 400 })
    }
    
    console.error('Error updating order:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

// POST /api/orders/[id]/refund - Create refund request
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    if (action === 'refund') {
      const body = await request.json()
      const validatedData = refundSchema.parse(body)

      // Verify order and calculate available refund amount
      const order = await prisma.order.findUnique({
        where: { id: params.id },
        select: { 
          total: true, 
          discount: true,
          status: true,
          couponId: true,
          refunds: {
            where: { status: { in: ['PENDING', 'APPROVED', 'PROCESSED'] } },
            select: { amount: true }
          }
        }
      })

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }

      const alreadyRefunded = order.refunds.reduce((sum, r) => sum + r.amount, 0)
      const availableAmount = order.total - alreadyRefunded

      if (validatedData.amount > availableAmount) {
        return NextResponse.json({ 
          error: `Refund amount exceeds available amount. Available: $${availableAmount.toFixed(2)}` 
        }, { status: 400 })
      }

      // Create refund
      const refund = await prisma.refund.create({
        data: {
          orderId: params.id,
          amount: validatedData.amount,
          reason: validatedData.reason,
          status: 'PENDING',
          requestedBy: session.user.id
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              discount: true,
              couponCode: true,
              user: {
                select: { name: true, email: true }
              }
            }
          },
          requestedByUser: {
            select: { name: true, email: true }
          }
        }
      })

      return NextResponse.json(refund, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues
      }, { status: 400 })
    }
    
    console.error('Error processing request:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}

// DELETE /api/orders/[id] - Soft delete order (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Soft delete the order
    const deletedOrder = await prisma.order.update({
      where: { id: params.id },
      data: { deletedAt: new Date() }
    })

    // Log the deletion
    await prisma.orderNote.create({
      data: {
        orderId: params.id,
        content: `Order soft deleted by admin`,
        isInternal: true,
        authorId: session.user.id
      }
    })

    return NextResponse.json({ 
      message: 'Order deleted successfully',
      orderId: deletedOrder.id 
    })
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 })
  }
}

// PATCH /api/orders/[id] - Partial update (same as PUT for compatibility)
export const PATCH = PUT