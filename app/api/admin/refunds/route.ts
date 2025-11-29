// app/api/admin/refunds/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (status && status !== 'all') {
      where.status = status
    }

    if (search) {
      where.OR = [
        {
          order: {
            orderNumber: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          order: {
            user: {
              email: {
                contains: search,
                mode: 'insensitive'
              }
            }
          }
        }
      ]
    }

    // Fetch refunds with pagination
    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              user: {
                select: {
                  name: true,
                  email: true,
                }
              }
            }
          },
          requestedByUser: {
            select: {
              name: true,
              email: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.refund.count({ where })
    ])

    return NextResponse.json({
      refunds,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching refunds:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch refunds',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Create a new refund request
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orderId, amount, reason } = body

    // Validate required fields
    if (!orderId || !amount) {
      return NextResponse.json({ 
        error: 'Missing required fields: orderId, amount' 
      }, { status: 400 })
    }

    // Verify order exists and belongs to user (unless admin)
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        total: true,
        status: true,
        paymentStatus: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check if user can request refund for this order
    if (session.user.role !== 'ADMIN' && order.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Validate refund amount doesn't exceed order total
    if (amount > order.total) {
      return NextResponse.json({ 
        error: 'Refund amount cannot exceed order total' 
      }, { status: 400 })
    }

    // Check if order is refundable
    if (order.status === 'CANCELLED' || order.paymentStatus !== 'PAID') {
      return NextResponse.json({ 
        error: 'Order is not eligible for refund' 
      }, { status: 400 })
    }

    // Create refund request
    const refund = await prisma.refund.create({
      data: {
        orderId,
        amount,
        reason: reason || null,
        status: 'PENDING',
        requestedBy: session.user.id
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            total: true,
            user: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        },
        requestedByUser: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    })

    return NextResponse.json(refund, { status: 201 })
  } catch (error) {
    console.error('Error creating refund:', error)
    return NextResponse.json({ 
      error: 'Failed to create refund',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}