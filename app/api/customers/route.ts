/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/customers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'
import { z } from 'zod'

const CustomersQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).default(1),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default(20),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'email', 'createdAt', 'totalSpent', 'lastOrderDate', 'totalOrders']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  role: z.enum(['USER', 'ADMIN', 'ALL']).default('ALL'),
  verified: z.enum(['true', 'false', 'all']).default('all'),
  hasOrders: z.enum(['true', 'false', 'all']).default('all'),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  minSpent: z.string().transform(Number).optional(),
  maxSpent: z.string().transform(Number).optional(),
})

const BulkActionSchema = z.object({
  action: z.enum(['promote_to_admin', 'demote_to_user', 'verify_email', 'unverify_email', 'delete']),
  customerIds: z.array(z.string()).min(1),
  reason: z.string().optional()
})

// GET /api/customers - Enhanced customer listing with advanced filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
    const {
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      role,
      verified,
      hasOrders,
      dateFrom,
      dateTo,
      minSpent,
      maxSpent
    } = CustomersQuerySchema.parse(searchParams)

    const skip = (page - 1) * limit
    const where: any = {}

    // Role filter
    if (role !== 'ALL') {
      where.role = role
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Email verification filter
    if (verified !== 'all') {
      where.emailVerified = verified === 'true' ? { not: null } : null
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo) where.createdAt.lte = new Date(dateTo)
    }

    // Has orders filter
    if (hasOrders !== 'all') {
      if (hasOrders === 'true') {
        where.orders = { some: {} }
      } else {
        where.orders = { none: {} }
      }
    }

    const orderBy: any = {}
    if (sortBy === 'totalSpent' || sortBy === 'lastOrderDate' || sortBy === 'totalOrders') {
      // These require special handling in post-processing
      orderBy.createdAt = sortOrder
    } else {
      orderBy[sortBy] = sortOrder
    }

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerified: true,
          image: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
              reviews: true,
              addresses: true,
              cart: true
            }
          },
          orders: {
            select: {
              id: true,
              total: true,
              status: true,
              createdAt: true
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 5 // Only get recent orders for performance
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ])

    // Calculate customer statistics and apply spending filters
    let customersWithStats = customers.map(customer => {
      const totalSpent = customer.orders.reduce((sum, order) => sum + order.total, 0)
      const lastOrderDate = customer.orders[0]?.createdAt || null
      const completedOrders = customer.orders.filter(order => order.status === 'DELIVERED').length
      const pendingOrders = customer.orders.filter(order => 
        ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.status)
      ).length
      const averageOrderValue = customer.orders.length > 0 ? totalSpent / customer.orders.length : 0

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        role: customer.role,
        emailVerified: customer.emailVerified,
        image: customer.image,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        totalSpent,
        lastOrderDate,
        completedOrders,
        pendingOrders,
        averageOrderValue,
        _count: customer._count,
        recentOrders: customer.orders.slice(0, 3) // Only return 3 recent orders
      }
    })

    // Apply spending filters
    if (minSpent !== undefined) {
      customersWithStats = customersWithStats.filter(c => c.totalSpent >= minSpent)
    }
    if (maxSpent !== undefined) {
      customersWithStats = customersWithStats.filter(c => c.totalSpent <= maxSpent)
    }

    // Apply custom sorting for calculated fields
    if (sortBy === 'totalSpent') {
      customersWithStats.sort((a, b) => 
        sortOrder === 'desc' ? b.totalSpent - a.totalSpent : a.totalSpent - b.totalSpent
      )
    } else if (sortBy === 'lastOrderDate') {
      customersWithStats.sort((a, b) => {
        if (!a.lastOrderDate && !b.lastOrderDate) return 0
        if (!a.lastOrderDate) return sortOrder === 'desc' ? 1 : -1
        if (!b.lastOrderDate) return sortOrder === 'desc' ? -1 : 1
        
        const aTime = new Date(a.lastOrderDate).getTime()
        const bTime = new Date(b.lastOrderDate).getTime()
        return sortOrder === 'desc' ? bTime - aTime : aTime - bTime
      })
    } else if (sortBy === 'totalOrders') {
      customersWithStats.sort((a, b) => 
        sortOrder === 'desc' 
          ? b._count.orders - a._count.orders 
          : a._count.orders - b._count.orders
      )
    }

    return NextResponse.json({
      customers: customersWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}

// POST /api/customers - Bulk actions on customers
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, customerIds, reason } = BulkActionSchema.parse(body)

    let results: any[] = []

    switch (action) {
      case 'promote_to_admin':
        results = await Promise.all(
          customerIds.map(async (id) => {
            try {
              const updated = await prisma.user.update({
                where: { id },
                data: { role: 'ADMIN' },
                select: { id: true, name: true, email: true, role: true }
              })
              
              // Log the role change
              await logCustomerAction(session.user.id, id, 'ROLE_CHANGE', {
                from: 'USER',
                to: 'ADMIN',
                reason: reason || 'Bulk promotion to admin'
              })
              
              return { success: true, customer: updated }
            } catch (error) {
              return { success: false, customerId: id, error: 'Failed to promote user' }
            }
          })
        )
        break

      case 'demote_to_user':
        results = await Promise.all(
          customerIds.map(async (id) => {
            try {
              // Prevent demoting self
              if (id === session.user.id) {
                return { success: false, customerId: id, error: 'Cannot demote yourself' }
              }

              const updated = await prisma.user.update({
                where: { id },
                data: { role: 'USER' },
                select: { id: true, name: true, email: true, role: true }
              })
              
              await logCustomerAction(session.user.id, id, 'ROLE_CHANGE', {
                from: 'ADMIN',
                to: 'USER',
                reason: reason || 'Bulk demotion to user'
              })
              
              return { success: true, customer: updated }
            } catch (error) {
              return { success: false, customerId: id, error: 'Failed to demote user' }
            }
          })
        )
        break

      case 'verify_email':
        results = await Promise.all(
          customerIds.map(async (id) => {
            try {
              const updated = await prisma.user.update({
                where: { id },
                data: { emailVerified: new Date() },
                select: { id: true, name: true, email: true, emailVerified: true }
              })
              
              await logCustomerAction(session.user.id, id, 'EMAIL_VERIFIED', {
                reason: reason || 'Bulk email verification'
              })
              
              return { success: true, customer: updated }
            } catch (error) {
              return { success: false, customerId: id, error: 'Failed to verify email' }
            }
          })
        )
        break

      case 'unverify_email':
        results = await Promise.all(
          customerIds.map(async (id) => {
            try {
              const updated = await prisma.user.update({
                where: { id },
                data: { emailVerified: null },
                select: { id: true, name: true, email: true, emailVerified: true }
              })
              
              await logCustomerAction(session.user.id, id, 'EMAIL_UNVERIFIED', {
                reason: reason || 'Bulk email unverification'
              })
              
              return { success: true, customer: updated }
            } catch (error) {
              return { success: false, customerId: id, error: 'Failed to unverify email' }
            }
          })
        )
        break

      case 'delete':
        results = await Promise.all(
          customerIds.map(async (id) => {
            try {
              // Prevent deleting self
              if (id === session.user.id) {
                return { success: false, customerId: id, error: 'Cannot delete yourself' }
              }

              // Check if user has orders
              const orderCount = await prisma.order.count({
                where: { userId: id }
              })

              if (orderCount > 0) {
                return { 
                  success: false, 
                  customerId: id, 
                  error: 'Cannot delete customer with existing orders' 
                }
              }

              await prisma.user.delete({
                where: { id }
              })
              
              await logCustomerAction(session.user.id, id, 'DELETED', {
                reason: reason || 'Bulk deletion'
              })
              
              return { success: true, customerId: id }
            } catch (error) {
              return { success: false, customerId: id, error: 'Failed to delete customer' }
            }
          })
        )
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({
      message: `Bulk action completed: ${successCount} successful, ${failureCount} failed`,
      results,
      summary: {
        total: customerIds.length,
        successful: successCount,
        failed: failureCount
      }
    })
  } catch (error) {
    console.error('Error performing bulk action:', error)
    return NextResponse.json(
      { error: 'Failed to perform bulk action' },
      { status: 500 }
    )
  }
}

// Helper function to log customer actions
async function logCustomerAction(
  performedBy: string,
  targetCustomerId: string,
  action: string,
  metadata: any
) {
  try {
    // You can implement a proper audit log table, for now we'll use a simple approach
    await prisma.orderNote.create({
      data: {
        orderId: 'system', // We'll use 'system' as a special orderId for non-order actions
        content: `Customer action: ${action}`,
        isInternal: true,
        authorId: performedBy,
        // Store metadata as JSON in the content or create a separate audit log table
      }
    })
  } catch (error) {
    console.error('Failed to log customer action:', error)
  }
}