/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/customers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'
import { z } from 'zod'

const UpdateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  emailVerified: z.boolean().optional(),
  notes: z.string().optional()
})

// GET /api/customers/[id] - Get detailed customer information
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const customer = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        orders: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    images: true,
                    price: true
                  }
                }
              }
            },
            shippingAddress: true,
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
              orderBy: {
                timestamp: 'desc'
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        addresses: {
          orderBy: {
            isDefault: 'desc'
          }
        },
        reviews: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        cart: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
                price: true,
                stock: true
              }
            }
          }
        },
        _count: {
          select: {
            orders: true,
            reviews: true,
            addresses: true,
            cart: true
          }
        }
      }
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Calculate comprehensive customer statistics
    const totalSpent = customer.orders.reduce((sum, order) => sum + order.total, 0)
    const completedOrders = customer.orders.filter(order => order.status === 'DELIVERED')
    const cancelledOrders = customer.orders.filter(order => order.status === 'CANCELLED')
    const refundedOrders = customer.orders.filter(order => order.status === 'REFUNDED')
    
    const averageOrderValue = customer.orders.length > 0 ? totalSpent / customer.orders.length : 0
    const lastOrderDate = customer.orders[0]?.createdAt || null
    const firstOrderDate = customer.orders[customer.orders.length - 1]?.createdAt || null
    
    // Calculate customer lifetime metrics
    const daysSinceFirstOrder = firstOrderDate 
      ? Math.floor((Date.now() - new Date(firstOrderDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0
    
    const daysSinceLastOrder = lastOrderDate
      ? Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
      : null

    // Product preferences (most ordered products)
    const productFrequency: { [productId: string]: { count: number; product: any } } = {}
    
    customer.orders.forEach(order => {
      order.items.forEach(item => {
        if (!productFrequency[item.productId]) {
          productFrequency[item.productId] = {
            count: 0,
            product: item.product
          }
        }
        productFrequency[item.productId].count += item.quantity
      })
    })
    
    const favoriteProducts = Object.values(productFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(item => ({
        ...item.product,
        orderCount: item.count
      }))

    // Monthly spending pattern
    const monthlySpending = customer.orders.reduce((acc: any, order) => {
      const month = new Date(order.createdAt).toISOString().substring(0, 7) // YYYY-MM
      acc[month] = (acc[month] || 0) + order.total
      return acc
    }, {})

    // Customer risk assessment
    const riskFactors = []
    if (cancelledOrders.length > 0) {
      const cancellationRate = (cancelledOrders.length / customer.orders.length) * 100
      if (cancellationRate > 20) riskFactors.push('High cancellation rate')
    }
    if (refundedOrders.length > 0) {
      const refundRate = (refundedOrders.length / customer.orders.length) * 100
      if (refundRate > 10) riskFactors.push('High refund rate')
    }
    if (daysSinceLastOrder && daysSinceLastOrder > 180) {
      riskFactors.push('Inactive customer (6+ months)')
    }

    const customerWithStats = {
      ...customer,
      stats: {
        // Order statistics
        totalSpent,
        totalOrders: customer.orders.length,
        completedOrders: completedOrders.length,
        cancelledOrders: cancelledOrders.length,
        refundedOrders: refundedOrders.length,
        pendingOrders: customer.orders.filter(order => 
          ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.status)
        ).length,
        
        // Order metrics
        averageOrderValue,
        lastOrderDate,
        firstOrderDate,
        daysSinceFirstOrder,
        daysSinceLastOrder,
        
        // Engagement metrics
        totalReviews: customer.reviews.length,
        averageRating: customer.reviews.length > 0 
          ? customer.reviews.reduce((sum, review) => sum + review.rating, 0) / customer.reviews.length
          : null,
        totalAddresses: customer.addresses.length,
        cartItems: customer.cart.length,
        cartValue: customer.cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0),
        
        // Behavioral insights
        favoriteProducts,
        monthlySpending,
        riskFactors,
        customerSegment: getCustomerSegment(totalSpent, customer.orders.length, daysSinceFirstOrder),
        lifetimeValue: calculateLifetimeValue(totalSpent, daysSinceFirstOrder, customer.orders.length)
      }
    }

    return NextResponse.json(customerWithStats)
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer details' },
      { status: 500 }
    )
  }
}

// PUT /api/customers/[id] - Update customer information
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = UpdateCustomerSchema.parse(body)

    // Check if email is being changed and if it's already taken
    if (data.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: { id: params.id }
        }
      })
      
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email address is already in use' },
          { status: 400 }
        )
      }
    }

    // Prevent self-demotion
    if (data.role === 'USER' && session.user.id === params.id) {
      return NextResponse.json(
        { error: 'Cannot demote yourself' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    
    if (data.name !== undefined) updateData.name = data.name
    if (data.email !== undefined) updateData.email = data.email
    if (data.role !== undefined) updateData.role = data.role
    if (data.emailVerified !== undefined) {
      updateData.emailVerified = data.emailVerified ? new Date() : null
    }

    const updatedCustomer = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Log the changes
    const changes = []
    if (data.role !== undefined) changes.push(`Role changed to ${data.role}`)
    if (data.emailVerified !== undefined) changes.push(`Email ${data.emailVerified ? 'verified' : 'unverified'}`)
    if (data.name !== undefined) changes.push(`Name updated`)
    if (data.email !== undefined) changes.push(`Email updated`)

    if (changes.length > 0) {
      await logCustomerAction(session.user.id, params.id, 'CUSTOMER_UPDATED', {
        changes,
        notes: data.notes
      })
    }

    return NextResponse.json({
      customer: updatedCustomer,
      message: 'Customer updated successfully'
    })
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    )
  }
}

// DELETE /api/customers/[id] - Delete customer (soft delete recommended)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Prevent self-deletion
    if (session.user.id === params.id) {
      return NextResponse.json(
        { error: 'Cannot delete yourself' },
        { status: 400 }
      )
    }

    // Check if customer has orders
    const orderCount = await prisma.order.count({
      where: { userId: params.id }
    })

    if (orderCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete customer with existing orders. Consider archiving instead.' },
        { status: 400 }
      )
    }

    // Get customer info before deletion for logging
    const customer = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, email: true }
    })

    await prisma.user.delete({
      where: { id: params.id }
    })

    await logCustomerAction(session.user.id, params.id, 'CUSTOMER_DELETED', {
      deletedCustomer: customer
    })

    return NextResponse.json({
      message: 'Customer deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    )
  }
}

// Helper functions
function getCustomerSegment(totalSpent: number, orderCount: number, daysSinceFirst: number): string {
  if (totalSpent === 0) return 'Prospect'
  if (totalSpent > 5000 && orderCount > 10) return 'VIP'
  if (totalSpent > 1000 && orderCount > 5) return 'Loyal'
  if (orderCount === 1) return 'One-time'
  if (daysSinceFirst > 365) return 'Long-term'
  return 'Regular'
}

function calculateLifetimeValue(totalSpent: number, daysSinceFirst: number, orderCount: number): number {
  if (daysSinceFirst === 0 || orderCount === 0) return totalSpent
  
  const averageOrderValue = totalSpent / orderCount
  const orderFrequency = orderCount / (daysSinceFirst / 30) // orders per month
  const projectedLifetime = 24 // months
  
  return averageOrderValue * orderFrequency * projectedLifetime
}

async function logCustomerAction(
  performedBy: string,
  targetCustomerId: string,
  action: string,
  metadata: any
) {
  try {
    // Create a system note for audit trail
    await prisma.orderNote.create({
      data: {
        orderId: 'system-' + Date.now(), // Unique system ID
        content: JSON.stringify({
          action,
          targetCustomerId,
          performedBy,
          timestamp: new Date().toISOString(),
          ...metadata
        }),
        isInternal: true,
        authorId: performedBy
      }
    })
  } catch (error) {
    console.error('Failed to log customer action:', error)
  }
}