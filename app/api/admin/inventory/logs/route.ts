// app/api/admin/inventory/logs/route.ts
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
    const reason = searchParams.get('reason')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (reason && reason !== 'all') {
      where.reason = reason
    }

    if (search) {
      where.product = {
        name: {
          contains: search,
          mode: 'insensitive'
        }
      }
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z')
      }
    }

    // Fetch logs with pagination
    const [logs, total] = await Promise.all([
      prisma.inventoryLog.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
            }
          },
          variant: {
            select: {
              name: true,
            }
          },
          changedByUser: {
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
      prisma.inventoryLog.count({ where })
    ])

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching inventory logs:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch inventory logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Create a new inventory log entry
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, variantId, changeAmount, reason, notes, referenceId } = body

    // Validate required fields
    if (!productId || changeAmount === undefined || !reason) {
      return NextResponse.json({ 
        error: 'Missing required fields: productId, changeAmount, reason' 
      }, { status: 400 })
    }

    // Get current stock
    let currentStock: number
    let newStock: number

    if (variantId) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        select: { stock: true }
      })
      if (!variant) {
        return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
      }
      currentStock = variant.stock
      newStock = currentStock + changeAmount

      // Update variant stock
      await prisma.productVariant.update({
        where: { id: variantId },
        data: { stock: newStock }
      })
    } else {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { stock: true }
      })
      if (!product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }
      currentStock = product.stock
      newStock = currentStock + changeAmount

      // Update product stock
      await prisma.product.update({
        where: { id: productId },
        data: { stock: newStock }
      })
    }

    // Create inventory log
    const log = await prisma.inventoryLog.create({
      data: {
        productId,
        variantId: variantId || null,
        changeAmount,
        newStock,
        reason,
        notes: notes || null,
        referenceId: referenceId || null,
        changedByUserId: session.user.id
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
          }
        },
        variant: {
          select: {
            name: true,
          }
        },
        changedByUser: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    })

    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    console.error('Error creating inventory log:', error)
    return NextResponse.json({ 
      error: 'Failed to create inventory log',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}