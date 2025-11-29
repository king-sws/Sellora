/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { generateOrderNumber } from '@/lib/utils'
import { auth } from '@/auth'
import { z } from 'zod'
import { Prisma, OrderStatus, PaymentStatus, OrderPriority, OrderSource } from '@prisma/client'

// Enhanced validation schema with coupon support
const createOrderSchema = z.object({
  shippingAddressId: z.string().optional(),
  shippingMethodId: z.string().optional(),
  notes: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  source: z.enum(['WEBSITE', 'MOBILE_APP', 'ADMIN_PANEL']).default('WEBSITE'),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  couponCode: z.string().optional(), // Coupon support
  idempotencyKey: z.string().optional() // ✅ NEW: Prevent duplicate orders

})

// GET /api/orders - Enhanced with coupon filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    
    // Parse pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const skip = (page - 1) * limit
    
    // Parse filters
    const status = searchParams.get('status')
    const paymentStatus = searchParams.get('paymentStatus')
    const priority = searchParams.get('priority')
    const source = searchParams.get('source')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const minAmount = searchParams.get('minAmount')
    const maxAmount = searchParams.get('maxAmount')
    const hasRefunds = searchParams.get('hasRefunds')
    const hasTracking = searchParams.get('hasTracking')
    const hasCoupon = searchParams.get('hasCoupon') // NEW: Filter by coupon usage
    const couponCode = searchParams.get('couponCode') // NEW: Filter by specific coupon
    const search = searchParams.get('search')
    
    // Parse sorting
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
    
    const includeAnalytics = searchParams.get('analytics') === 'true'

    // Build where clause
    const whereClause: Prisma.OrderWhereInput = {
      deletedAt: null
    }
    
    // User permission check
    if (session.user.role !== 'ADMIN') {
      whereClause.userId = session.user.id
    }
    
    // Apply filters
    if (status && status !== 'all') {
      whereClause.status = status as OrderStatus
    }
    
    if (paymentStatus && paymentStatus !== 'all') {
      whereClause.paymentStatus = paymentStatus as PaymentStatus
    }
    
    if (priority && priority !== 'all') {
      whereClause.priority = priority as OrderPriority
    }
    
    if (source && source !== 'all') {
      whereClause.source = source as OrderSource
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      whereClause.createdAt = {}
      if (dateFrom) {
        const fromDate = new Date(dateFrom)
        if (!isNaN(fromDate.getTime())) {
          whereClause.createdAt.gte = fromDate
        }
      }
      if (dateTo) {
        const toDate = new Date(dateTo)
        if (!isNaN(toDate.getTime())) {
          whereClause.createdAt.lte = toDate
        }
      }
    }
    
    // Amount range filter
    if (minAmount || maxAmount) {
      whereClause.total = {}
      if (minAmount) {
        const min = parseFloat(minAmount)
        if (!isNaN(min)) whereClause.total.gte = min
      }
      if (maxAmount) {
        const max = parseFloat(maxAmount)
        if (!isNaN(max)) whereClause.total.lte = max
      }
    }
    
    // Special filters
    if (hasRefunds === 'true') {
      whereClause.refunds = { some: {} }
    }
    
    if (hasTracking === 'true') {
      whereClause.trackingNumber = { not: null }
    }

    // NEW: Coupon filters
    if (hasCoupon === 'true') {
      whereClause.couponId = { not: null }
    } else if (hasCoupon === 'false') {
      whereClause.couponId = null
    }

    if (couponCode) {
      whereClause.couponCode = { contains: couponCode, mode: 'insensitive' }
    }
    
    // Search functionality
    if (search && search.trim()) {
      whereClause.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { 
          user: { 
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } }
            ]
          }
        },
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { couponCode: { contains: search, mode: 'insensitive' } } // NEW: Search by coupon
      ]
    }

    // Build orderBy clause
    const orderByClause: Prisma.OrderOrderByWithRelationInput = {}
    if (sortBy === 'customer') {
      orderByClause.user = { name: sortOrder }
    } else if (['orderNumber', 'createdAt', 'updatedAt', 'total', 'status', 'paymentStatus', 'discount'].includes(sortBy)) {
      orderByClause[sortBy as keyof Prisma.OrderOrderByWithRelationInput] = sortOrder
    } else {
      orderByClause.createdAt = sortOrder
    }

    // Execute queries
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
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
              role: true
            }
          },
          shippingAddress: true,
          shippingMethod: true,
          coupon: { // NEW: Include coupon details
            select: {
              id: true,
              code: true,
              type: true,
              value: true,
              description: true
            }
          },
          statusHistory: session.user.role === 'ADMIN' ? {
            select: {
              fromStatus: true,
              toStatus: true,
              timestamp: true,
              reason: true,
              changedByUser: {
                select: {
                  name: true,
                  email: true
                }
              }
            },
            orderBy: { timestamp: 'desc' },
            take: 3
          } : undefined,
          refunds: {
            select: {
              id: true,
              amount: true,
              status: true,
              reason: true,
              createdAt: true
            }
          },
          notes: session.user.role === 'ADMIN' ? {
            select: {
              id: true,
              content: true,
              isInternal: true,
              createdAt: true,
              author: {
                select: {
                  name: true,
                  email: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 2
          } : {
            where: { isInternal: false },
            select: {
              id: true,
              content: true,
              createdAt: true,
              author: {
                select: {
                  name: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 2
          },
          _count: {
            select: {
              items: true,
              refunds: true,
              notes: true
            }
          }
        },
        orderBy: orderByClause,
        skip,
        take: limit
      }),
      prisma.order.count({ where: whereClause })
    ])

    // Analytics data (for admin users only)
    let analytics = {}
    if (includeAnalytics && session.user.role === 'ADMIN') {
      try {
        const analyticsWhereClause = { ...whereClause }
        delete analyticsWhereClause.OR

        const [
          statusBreakdown,
          paymentBreakdown,
          priorityBreakdown,
          revenueStats,
          couponStats, // NEW: Coupon analytics
          recentActivity
        ] = await Promise.all([
          prisma.order.groupBy({
            by: ['status'],
            where: analyticsWhereClause,
            _count: true,
            _sum: { total: true }
          }),
          
          prisma.order.groupBy({
            by: ['paymentStatus'],
            where: analyticsWhereClause,
            _count: true,
            _sum: { total: true }
          }),
          
          prisma.order.groupBy({
            by: ['priority'],
            where: analyticsWhereClause,
            _count: true,
            _avg: { total: true }
          }),
          
          prisma.order.aggregate({
            where: { 
              ...analyticsWhereClause,
              paymentStatus: 'PAID'
            },
            _sum: { total: true, subtotal: true, tax: true, shipping: true, discount: true },
            _avg: { total: true, discount: true },
            _count: true
          }),
          
          // NEW: Coupon usage statistics
          prisma.order.aggregate({
            where: {
              ...analyticsWhereClause,
              couponId: { not: null }
            },
            _count: true,
            _sum: { discount: true },
            _avg: { discount: true }
          }),
          
          prisma.orderStatusHistory.findMany({
            where: {
              timestamp: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
              },
              ...(session.user.role !== 'ADMIN' ? {
                order: { userId: session.user.id }
              } : {})
            },
            include: {
              order: {
                select: {
                  orderNumber: true,
                  user: {
                    select: { name: true, email: true }
                  }
                }
              },
              changedByUser: {
                select: { name: true, email: true }
              }
            },
            orderBy: { timestamp: 'desc' },
            take: 10
          })
        ])

        analytics = {
          statusBreakdown,
          paymentBreakdown,
          priorityBreakdown,
          revenue: {
            total: revenueStats._sum.total || 0,
            subtotal: revenueStats._sum.subtotal || 0,
            tax: revenueStats._sum.tax || 0,
            shipping: revenueStats._sum.shipping || 0,
            discount: revenueStats._sum.discount || 0,
            average: revenueStats._avg.total || 0,
            averageDiscount: revenueStats._avg.discount || 0,
            orderCount: revenueStats._count
          },
          coupons: {
            ordersWithCoupons: couponStats._count,
            totalDiscount: couponStats._sum.discount || 0,
            averageDiscount: couponStats._avg.discount || 0,
            usageRate: revenueStats._count > 0 
              ? Math.round((couponStats._count / revenueStats._count) * 100) 
              : 0
          },
          recentActivity
        }
      } catch (analyticsError) {
        console.error('Analytics error:', analyticsError)
        analytics = { error: 'Failed to load analytics' }
      }
    }

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      ...(includeAnalytics ? { analytics } : {})
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch orders',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 })
  }
}

// POST /api/orders - Enhanced with coupon application
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createOrderSchema.parse(body)

    // ✅ FIX: Check for duplicate orders using idempotency key
    if (validatedData.idempotencyKey) {
      const existingOrder = await prisma.order.findFirst({
        where: {
          idempotencyKey: validatedData.idempotencyKey,
          userId: session.user.id
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                  slug: true,
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
          }
        }
      })

      if (existingOrder) {
        console.log('Duplicate order request detected:', validatedData.idempotencyKey)
        return NextResponse.json(existingOrder, { status: 200 })
      }
    }

    // Get user's cart with active products
    const cartItems = await prisma.cartItem.findMany({
      where: { 
        userId: session.user.id,
        product: {
          isActive: true,
          deletedAt: null
        }
      },
      include: { 
        product: {
          include: {
            category: true
          }
        },
        variant: true
      }
    })

    if (cartItems.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    // Validate shipping address
    let shippingAddress = null
    if (validatedData.shippingAddressId) {
      shippingAddress = await prisma.address.findFirst({
        where: {
          id: validatedData.shippingAddressId,
          userId: session.user.id
        }
      })

      if (!shippingAddress) {
        return NextResponse.json({ error: 'Invalid shipping address' }, { status: 400 })
      }
    }

    // Validate shipping method
    let shippingMethod = null
    let shippingCost = 0
    if (validatedData.shippingMethodId) {
      shippingMethod = await prisma.shippingMethod.findFirst({
        where: {
          id: validatedData.shippingMethodId,
          isActive: true
        }
      })

      if (!shippingMethod) {
        return NextResponse.json({ error: 'Invalid shipping method' }, { status: 400 })
      }
      shippingCost = shippingMethod.price
    } else {
      // Default shipping calculation
      const subtotal = cartItems.reduce((sum, item) => 
        sum + ((item.variant?.price || item.product.price) * item.quantity), 0
      )
      shippingCost = subtotal >= 50 ? 0 : 9.99
    }

    // Get client metadata
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const referrer = request.headers.get('referer') || null

    // ✅ CRITICAL: Create order with transaction-safe coupon handling
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Calculate subtotal
      const subtotal = cartItems.reduce((sum, item) => {
        const price = item.variant?.price || item.product.price
        return sum + (price * item.quantity)
      }, 0)

      // Step 2: Get tax rate from settings or use default
      const taxSetting = await tx.storeSetting.findUnique({
        where: { key: 'tax_rate' }
      })
      const taxRate = taxSetting ? parseFloat(taxSetting.value || '0.08') : 0.08

      // Step 3: ✅ FIX: Validate and apply coupon INSIDE transaction
      let coupon = null
      let discount = 0
      let couponId = null
      let couponValidationError = null

      if (validatedData.couponCode) {
        const couponCode = validatedData.couponCode.toUpperCase().trim()
        const now = new Date()
        
        // Find coupon with case-insensitive search
        coupon = await tx.coupon.findFirst({
          where: {
            code: {
              equals: couponCode,
              mode: 'insensitive'
            },
            deletedAt: null,
            isActive: true
          }
        })

        if (!coupon) {
          couponValidationError = 'Invalid or inactive coupon code'
        } else {
          // Check start date
          if (coupon.startsAt && new Date(coupon.startsAt) > now) {
            couponValidationError = `This coupon will be active from ${new Date(coupon.startsAt).toLocaleDateString()}`
          }

          // Check expiry date (end of day)
          if (coupon.expiresAt) {
            const expiresAtEndOfDay = new Date(coupon.expiresAt)
            expiresAtEndOfDay.setHours(23, 59, 59, 999)
            if (expiresAtEndOfDay < now) {
              couponValidationError = 'This coupon has expired'
            }
          }

          // ✅ FIX: Atomic check for global usage limit
          if (!couponValidationError && coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
            couponValidationError = 'This coupon has reached its maximum usage limit'
          }

          // ✅ FIX: Check per-user usage limit
          if (!couponValidationError && coupon.maxUsesPerUser) {
            const userUsageCount = await tx.couponUsage.count({
              where: {
                couponId: coupon.id,
                userId: session.user.id
              }
            })

            if (userUsageCount >= coupon.maxUsesPerUser) {
              couponValidationError = `You have already used this coupon ${userUsageCount} time(s)`
            }
          }

          // Check minimum amount
          if (!couponValidationError && coupon.minAmount && subtotal < coupon.minAmount) {
            couponValidationError = `Minimum order amount of $${coupon.minAmount.toFixed(2)} required`
          }

          // If all validations pass, calculate discount
          if (!couponValidationError) {
            if (coupon.type === 'PERCENTAGE') {
              discount = (subtotal * coupon.value) / 100
            } else if (coupon.type === 'FIXED_AMOUNT') {
              discount = coupon.value
            }

            discount = Math.min(discount, subtotal)
            discount = Math.round(discount * 100) / 100
            couponId = coupon.id
          }
        }

        // If coupon validation failed, throw error
        if (couponValidationError) {
          throw new Error(couponValidationError)
        }
      }

      // Step 4: Calculate tax on discounted subtotal
      const discountedSubtotal = Math.max(0, subtotal - discount)
      const tax = Math.round(discountedSubtotal * taxRate * 100) / 100

      // Step 5: Calculate final total
      const shipping = shippingCost
      const total = Math.max(0, Math.round((discountedSubtotal + tax + shipping) * 100) / 100)

      // Step 6: Validate calculations
      if (isNaN(subtotal) || isNaN(tax) || isNaN(shipping) || isNaN(discount) || isNaN(total)) {
        throw new Error('Invalid calculation results')
      }

      // Step 7: ✅ FIX: Atomic stock validation and decrement
      for (const item of cartItems) {
        const stockField = item.variantId ? 'variant.stock' : 'stock'
        const stockWhere = item.variantId 
          ? { id: item.productId, variants: { some: { id: item.variantId, stock: { gte: item.quantity } } } }
          : { id: item.productId, stock: { gte: item.quantity } }

        // Update with atomic check
        if (item.variantId) {
          const variantUpdate = await tx.productVariant.updateMany({
            where: {
              id: item.variantId,
              stock: { gte: item.quantity }
            },
            data: {
              stock: { decrement: item.quantity }
            }
          })

          if (variantUpdate.count === 0) {
            throw new Error(`Insufficient stock for ${item.product.name} (variant)`)
          }
        } else {
          const productUpdate = await tx.product.updateMany({
            where: {
              id: item.productId,
              stock: { gte: item.quantity }
            },
            data: {
              stock: { decrement: item.quantity }
            }
          })

          if (productUpdate.count === 0) {
            throw new Error(`Insufficient stock for ${item.product.name}`)
          }
        }
      }

      // Step 8: Create the order
      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: session.user.id,
          subtotal,
          tax,
          shipping,
          discount,
          total,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          priority: validatedData.priority as OrderPriority,
          source: validatedData.source as OrderSource,
          shippingAddressId: validatedData.shippingAddressId || null,
          shippingMethodId: validatedData.shippingMethodId || null,
          
          // Coupon data
          couponId,
          couponCode: coupon?.code || null,
          
          // Idempotency
          idempotencyKey: validatedData.idempotencyKey || null,
          
          // Metadata
          customerIp: clientIp,
          userAgent: userAgent.substring(0, 500),
          referrer,
          utmSource: validatedData.utmSource,
          utmMedium: validatedData.utmMedium,
          utmCampaign: validatedData.utmCampaign,
          
          // Create order items
          items: {
            create: cartItems.map(item => ({
              productId: item.productId,
              variantId: item.variantId || null,
              quantity: item.quantity,
              price: item.variant?.price || item.product.price
            }))
          }
        }
      })

      // Step 9: ✅ FIX: Atomic coupon usage increment and usage tracking
      if (couponId && coupon) {
        // Increment global usage count atomically
        await tx.coupon.update({
          where: { id: couponId },
          data: {
            usedCount: { increment: 1 }
          }
        })

        // Create usage record
        await tx.couponUsage.create({
          data: {
            couponId: couponId,
            userId: session.user.id,
            orderId: order.id,
            discount: discount
          }
        })
      }

      // Step 10: Create status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: 'PENDING',
          toStatus: 'PENDING',
          changedBy: session.user.id,
          reason: 'Order created',
          metadata: {
            source: validatedData.source,
            itemCount: cartItems.length,
            couponApplied: coupon ? {
              code: coupon.code,
              type: coupon.type,
              value: coupon.value,
              discount: discount
            } : null,
            clientInfo: {
              ip: clientIp,
              userAgent: userAgent.substring(0, 255),
              referrer
            }
          }
        }
      })

      // Step 11: Add initial note if provided
      if (validatedData.notes) {
        await tx.orderNote.create({
          data: {
            orderId: order.id,
            content: validatedData.notes,
            isInternal: false,
            authorId: session.user.id
          }
        })
      }

      // Step 12: Create inventory logs
      for (const item of cartItems) {
        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            variantId: item.variantId || null,
            changeAmount: -item.quantity,
            newStock: item.variantId 
              ? (item.variant!.stock - item.quantity)
              : (item.product.stock - item.quantity),
            reason: 'SALE',
            referenceId: order.id,
            notes: `Order ${order.orderNumber}`,
            changedByUserId: session.user.id
          }
        })
      }

      // Step 13: Clear user's cart
      await tx.cartItem.deleteMany({
        where: { userId: session.user.id }
      })

      // Step 14: Return complete order with all relations
      return await tx.order.findUnique({
        where: { id: order.id },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                  slug: true,
                  sku: true,
                  category: {
                    select: {
                      name: true,
                      slug: true
                    }
                  }
                }
              },
              variant: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  attributes: true,
                  images: true
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
            orderBy: { timestamp: 'desc' }
          },
          notes: {
            include: {
              author: {
                select: {
                  name: true,
                  email: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        }
      })
    }, {
      timeout: 10000, // ✅ Increased timeout for complex operations
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable // ✅ Highest isolation level
    })

    return NextResponse.json(result, { status: 201 })

  } catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ 
      error: 'Validation error',
      details: error.issues
    }, { status: 400 })
  }
  
  // ✅ Better coupon error messages
  if (error instanceof Error) {
    // Check if it's a coupon-related error
    const couponErrors = [
      'Invalid or inactive coupon',
      'coupon has expired',
      'maximum usage limit',
      'already used this coupon',
      'Minimum order amount'
    ]
    
    const isCouponError = couponErrors.some(msg => 
      error.message.includes(msg)
    )
    
    if (isCouponError) {
      return NextResponse.json({ 
        error: 'Coupon validation failed',
        message: error.message
      }, { status: 400 })
    }
  }
  
  console.error('Error creating order:', error)
  return NextResponse.json({ 
    error: 'Failed to create order',
    message: error instanceof Error ? error.message : 'Unknown error'
  }, { status: 500 })
}
}

// PATCH /api/orders - Bulk operations (unchanged)
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, orderIds, data } = body

    if (!action || !orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
    }

    let results: any = []

    switch (action) {
      case 'bulkStatusUpdate':
        const { status, reason } = data || {}
        if (!status || !Object.values(OrderStatus).includes(status)) {
          return NextResponse.json({ error: 'Valid status is required' }, { status: 400 })
        }

        results = await prisma.$transaction(async (tx) => {
          const updates = []
          
          for (const orderId of orderIds) {
            try {
              const currentOrder = await tx.order.findUnique({
                where: { id: orderId },
                select: { status: true }
              })

              if (!currentOrder) continue

              const updatedOrder = await tx.order.update({
                where: { id: orderId },
                data: { 
                  status: status as OrderStatus,
                  updatedAt: new Date(),
                  ...(status === 'DELIVERED' ? { deliveredAt: new Date() } : {})
                }
              })

              await tx.orderStatusHistory.create({
                data: {
                  orderId,
                  fromStatus: currentOrder.status,
                  toStatus: status as OrderStatus,
                  changedBy: session.user.id,
                  reason: reason || 'Bulk status update',
                  metadata: {
                    bulkOperation: true,
                    affectedOrders: orderIds.length
                  }
                }
              })

              updates.push(updatedOrder)
            } catch (itemError) {
              console.error(`Error updating order ${orderId}:`, itemError)
            }
          }
          
          return updates
        })
        break

      case 'bulkPriorityUpdate':
        const { priority } = data || {}
        if (!priority || !Object.values(OrderPriority).includes(priority)) {
          return NextResponse.json({ error: 'Valid priority is required' }, { status: 400 })
        }

        results = await prisma.order.updateMany({
          where: { 
            id: { in: orderIds },
            deletedAt: null
          },
          data: { 
            priority: priority as OrderPriority,
            updatedAt: new Date()
          }
        })
        break

      case 'bulkAddNote':
        const { note, isInternal = false } = data || {}
        if (!note || typeof note !== 'string' || note.trim() === '') {
          return NextResponse.json({ error: 'Note content is required' }, { status: 400 })
        }

        results = await prisma.$transaction(async (tx) => {
          const notes = []
          for (const orderId of orderIds) {
            try {
              const createdNote = await tx.orderNote.create({
                data: {
                  orderId,
                  content: note.trim(),
                  isInternal: Boolean(isInternal),
                  authorId: session.user.id
                }
              })
              notes.push(createdNote)
            } catch (itemError) {
              console.error(`Error adding note to order ${orderId}:`, itemError)
            }
          }
          return notes
        })
        break

      case 'bulkDelete':
        results = await prisma.$transaction(async (tx) => {
          const deletedOrders = await tx.order.updateMany({
            where: { 
              id: { in: orderIds },
              deletedAt: null
            },
            data: { 
              deletedAt: new Date()
            }
          })
          
          for (const orderId of orderIds) {
            try {
              await tx.orderNote.create({
                data: {
                  orderId,
                  content: `Order bulk deleted by admin`,
                  isInternal: true,
                  authorId: session.user.id
                }
              })
            } catch (itemError) {
              // Ignore errors for orders that don't exist
            }
          }
          
          return deletedOrders
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid bulk action' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      action,
      affectedCount: Array.isArray(results) ? results.length : results.count || 0,
      results: action === 'bulkStatusUpdate' ? results : undefined
    })

  } catch (error) {
    console.error('Error in bulk operation:', error)
    return NextResponse.json({ 
      error: 'Bulk operation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE /api/orders - Bulk soft delete (unchanged)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderIds }: { orderIds: string[] } = await request.json()

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'Order IDs array is required' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const deletedOrders = await tx.order.updateMany({
        where: { 
          id: { in: orderIds },
          deletedAt: null
        },
        data: { deletedAt: new Date() }
      })

      for (const orderId of orderIds) {
        try {
          await tx.orderNote.create({
            data: {
              orderId,
              content: `Order bulk deleted by admin`,
              isInternal: true,
              authorId: session.user.id
            }
          })
        } catch (itemError) {
          // Ignore errors
        }
      }

      return deletedOrders
    })

    return NextResponse.json({
      message: 'Orders deleted successfully',
      deletedCount: result.count
    })
  } catch (error) {
    console.error('Error deleting orders:', error)
    return NextResponse.json({ 
      error: 'Failed to delete orders',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}