// app/api/products/[id]/stock/route.ts - FULLY OPTIMIZED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'
import { z } from 'zod'

// ===================================
// VALIDATION SCHEMAS
// ===================================

const StockUpdateSchema = z.object({
  stock: z.number().int().nonnegative('Stock must be a non-negative integer'),
  reason: z.enum(['SALE', 'RETURN', 'ADJUSTMENT_MANUAL', 'RECEIVING', 'CANCELLATION']).optional(),
  notes: z.string().optional(),
  variantId: z.string().optional()
})

// ===================================
// CUSTOM ERRORS
// ===================================

class ProductNotFoundError extends Error {
  constructor(id: string) {
    super(`Product ${id} not found`)
    this.name = 'ProductNotFoundError'
  }
}

class VariantNotFoundError extends Error {
  constructor(id: string) {
    super(`Variant ${id} not found`)
    this.name = 'VariantNotFoundError'
  }
}

class InactiveItemError extends Error {
  constructor(type: 'product' | 'variant') {
    super(`Cannot update stock for inactive ${type}`)
    this.name = 'InactiveItemError'
  }
}

// ===================================
// HELPER FUNCTIONS
// ===================================

async function logRequest(endpoint: string, duration: number, success: boolean, error?: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${endpoint}] ${success ? '✓' : '✗'} ${duration}ms ${error ? `- ${error}` : ''}`)
  }
}

// ===================================
// PATCH /api/products/[id]/stock
// ===================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  
  try {
    const session = await auth()
        
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Validate product ID format
    if (!id || id.length < 10) {
      return NextResponse.json(
        { error: 'Invalid product ID format' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate with Zod
    const validation = StockUpdateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { stock, reason, notes, variantId } = validation.data

    // VARIANT STOCK UPDATE
    if (variantId) {
      const result = await prisma.$transaction(async (tx) => {
        // Get current variant with optimistic lock
        const currentVariant = await tx.productVariant.findUnique({
          where: { id: variantId },
          select: { 
            stock: true, 
            productId: true, 
            name: true, 
            sku: true,
            isActive: true 
          }
        })

        if (!currentVariant) {
          throw new VariantNotFoundError(variantId)
        }

        if (currentVariant.productId !== id) {
          throw new Error('VARIANT_MISMATCH')
        }

        if (!currentVariant.isActive) {
          throw new InactiveItemError('variant')
        }

        const stockChange = stock - currentVariant.stock

        // Update variant stock with optimistic lock
        const updatedVariant = await tx.productVariant.update({
          where: { 
            id: variantId,
            stock: currentVariant.stock // Optimistic lock
          },
          data: { 
            stock: stock,
            updatedAt: new Date()
          },
          include: {
            product: {
              include: {
                category: { select: { id: true, name: true, slug: true } },
                brand: { select: { id: true, name: true, slug: true, logo: true } }
              }
            }
          }
        })

        // Create inventory log ONLY if stock changed
        if (stockChange !== 0) {
          await tx.inventoryLog.create({
            data: {
              productId: id,
              variantId: variantId,
              changeAmount: stockChange,
              newStock: stock,
              reason: reason || 'ADJUSTMENT_MANUAL',
              notes: notes || `Variant "${currentVariant.name}" (${currentVariant.sku}) stock updated from ${currentVariant.stock} to ${stock}`,
              changedByUserId: session.user.id!
            }
          })
        }

        return {
          variant: updatedVariant,
          stockChange,
          previousStock: currentVariant.stock,
          newStock: stock
        }
      }, {
        maxWait: 5000,
        timeout: 10000
      })

      await logRequest(`PATCH /api/products/${id}/stock (variant)`, Date.now() - startTime, true)

      return NextResponse.json({
        success: true,
        message: 'Variant stock updated successfully',
        data: result
      })
    }

    // PRODUCT STOCK UPDATE
    const result = await prisma.$transaction(async (tx) => {
      // Get current product with optimistic lock
      const currentProduct = await tx.product.findUnique({
        where: { id },
        select: { 
          stock: true, 
          name: true, 
          sku: true,
          isActive: true,
          deletedAt: true
        }
      })

      if (!currentProduct) {
        throw new ProductNotFoundError(id)
      }

      if (currentProduct.deletedAt) {
        throw new Error('PRODUCT_DELETED')
      }

      if (!currentProduct.isActive) {
        throw new InactiveItemError('product')
      }

      const stockChange = stock - currentProduct.stock

      // Update product stock with optimistic lock
      const updatedProduct = await tx.product.update({
        where: { 
          id,
          stock: currentProduct.stock // Optimistic lock
        },
        data: { 
          stock: stock,
          updatedAt: new Date()
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true, logo: true } },
          variants: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              sku: true,
              stock: true,
              price: true
            }
          }
        }
      })

      // Create inventory log ONLY if stock changed
      if (stockChange !== 0) {
        await tx.inventoryLog.create({
          data: {
            productId: id,
            changeAmount: stockChange,
            newStock: stock,
            reason: reason || 'ADJUSTMENT_MANUAL',
            notes: notes || `Product "${currentProduct.name}" stock updated from ${currentProduct.stock} to ${stock}`,
            changedByUserId: session.user.id!
          }
        })
      }

      return {
        product: updatedProduct,
        stockChange,
        previousStock: currentProduct.stock,
        newStock: stock
      }
    }, {
      maxWait: 5000,
      timeout: 10000
    })

    await logRequest(`PATCH /api/products/${id}/stock`, Date.now() - startTime, true)

    return NextResponse.json({
      success: true,
      message: 'Product stock updated successfully',
      data: result
    })

  } catch (error) {
    await logRequest(`PATCH /api/products/[id]/stock`, Date.now() - startTime, false, (error as Error).message)
    console.error('Error updating stock:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', errors: error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    if (error instanceof ProductNotFoundError || error instanceof VariantNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    if (error instanceof InactiveItemError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    if ((error as Error).message === 'VARIANT_MISMATCH') {
      return NextResponse.json(
        { error: 'Variant does not belong to this product' },
        { status: 400 }
      )
    }

    if ((error as Error).message === 'PRODUCT_DELETED') {
      return NextResponse.json(
        { error: 'Cannot update stock for deleted product' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to update stock',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}

// ===================================
// GET /api/products/[id]/stock - Stock history
// ===================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  
  try {
    const session = await auth()
        
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Validate product ID
    if (!id || id.length < 10) {
      return NextResponse.json(
        { error: 'Invalid product ID format' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const variantId = searchParams.get('variantId')
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const reason = searchParams.get('reason')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true, stock: true, deletedAt: true }
    })

    if (!product) {
      throw new ProductNotFoundError(id)
    }

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      productId: id
    }

    if (variantId) {
      // Verify variant belongs to product
      const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        select: { productId: true }
      })

      if (!variant || variant.productId !== id) {
        return NextResponse.json(
          { error: 'Variant not found or does not belong to this product' },
          { status: 404 }
        )
      }

      where.variantId = variantId
    }

    if (reason) {
      where.reason = reason
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    // Fetch logs with related data
    const logs = await prisma.inventoryLog.findMany({
      where,
      include: {
        changedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        variant: {
          select: {
            id: true,
            name: true,
            sku: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    // Calculate comprehensive statistics
    const allLogs = await prisma.inventoryLog.findMany({
      where: { productId: id },
      select: { reason: true, changeAmount: true }
    })

    const statistics = {
      totalLogs: allLogs.length,
      byReason: {
        sales: allLogs.filter(l => l.reason === 'SALE').length,
        returns: allLogs.filter(l => l.reason === 'RETURN').length,
        adjustments: allLogs.filter(l => l.reason === 'ADJUSTMENT_MANUAL').length,
        receiving: allLogs.filter(l => l.reason === 'RECEIVING').length,
        cancellations: allLogs.filter(l => l.reason === 'CANCELLATION').length
      },
      stockMovement: {
        totalAdded: allLogs
          .filter(l => l.changeAmount > 0)
          .reduce((sum, l) => sum + l.changeAmount, 0),
        totalRemoved: Math.abs(
          allLogs
            .filter(l => l.changeAmount < 0)
            .reduce((sum, l) => sum + l.changeAmount, 0)
        ),
        netChange: allLogs.reduce((sum, l) => sum + l.changeAmount, 0)
      },
      currentStock: product.stock
    }

    // Get variant stocks if applicable
    let variantStocks = null
    if (!variantId) {
      variantStocks = await prisma.productVariant.findMany({
        where: { 
          productId: id,
          isActive: true 
        },
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true
        }
      })
    }

    await logRequest(`GET /api/products/${id}/stock`, Date.now() - startTime, true)

    const headers = new Headers()
    headers.set('Cache-Control', 'private, no-cache')

    return NextResponse.json({
      logs,
      statistics,
      variantStocks,
      product: {
        id: product.id,
        name: product.name,
        currentStock: product.stock,
        isDeleted: !!product.deletedAt
      }
    }, { headers })

  } catch (error) {
    await logRequest(`GET /api/products/[id]/stock`, Date.now() - startTime, false, (error as Error).message)
    console.error('Error fetching stock history:', error)
    
    if (error instanceof ProductNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch stock history',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}