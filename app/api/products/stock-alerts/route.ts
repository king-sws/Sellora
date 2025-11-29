/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/products/stock-alerts/route.ts - FULLY OPTIMIZED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'
import { Prisma } from '@prisma/client'

// ===================================
// HELPER FUNCTIONS
// ===================================

function calculateUrgencyScore(
  stockLevel: number,
  threshold: number,
  salesVelocity: number,
  inCarts: number
): number {
  if (stockLevel === 0) return 100

  const salesFactor = Math.min(salesVelocity * 2, 40)
  const cartFactor = Math.min(inCarts * 5, 30)
  const stockFactor = Math.min((threshold - stockLevel) * 3, 30)
  
  return Math.min(salesFactor + cartFactor + stockFactor, 99)
}

function getStatus(stockLevel: number, threshold: number): 'critical' | 'urgent' | 'warning' {
  if (stockLevel === 0) return 'critical'
  if (stockLevel <= Math.floor(threshold / 2)) return 'urgent'
  return 'warning'
}

// ===================================
// GET /api/products/stock-alerts - OPTIMIZED
// ===================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
       
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const includeVariants = searchParams.get('includeVariants') !== 'false'
    const threshold = parseInt(searchParams.get('threshold') || '10')
    const sortBy = searchParams.get('sortBy') || 'urgency'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))

    if (threshold < 1 || threshold > 100) {
      return NextResponse.json(
        { error: 'Threshold must be between 1 and 100' },
        { status: 400 }
      )
    }

    const skip = (page - 1) * limit

    // ✅ Build where clause
    const productWhere: Prisma.ProductWhereInput = {
      deletedAt: null,
      isActive: true
    }

    if (type === 'low') {
      productWhere.stock = { gt: 0, lte: threshold }
    } else if (type === 'out') {
      productWhere.stock = 0
    } else {
      productWhere.OR = [
        { stock: 0 },
        { stock: { gt: 0, lte: threshold } }
      ]
    }

    // ✅ OPTIMIZED: Single query for products with pagination
    const [products, totalProducts] = await Promise.all([
      prisma.product.findMany({
        where: productWhere,
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
          stock: true,
          price: true,
          images: true,
          salesCount: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          },
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true
            }
          },
          variants: includeVariants ? {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              sku: true,
              stock: true,
              price: true,
              attributes: true
            },
            orderBy: { stock: 'asc' }
          } : false,
          _count: {
            select: {
              orderItems: true,
              variants: true,
              cartItems: true
            }
          }
        },
        orderBy: { stock: 'asc' },
        skip,
        take: limit
      }),
      prisma.product.count({ where: productWhere })
    ])

    // ✅ OPTIMIZED: Batch fetch recent inventory logs
    const productIds = products.map(p => p.id)
    
    const recentLogs = await prisma.inventoryLog.findMany({
      where: {
        productId: { in: productIds },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      select: {
        id: true,
        productId: true,
        changeAmount: true,
        reason: true,
        createdAt: true,
        changedByUser: {
          select: {
            id: true,
            name: true
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
      orderBy: { createdAt: 'desc' }
    })

    // Group logs by product
    const logsByProduct = new Map<string, typeof recentLogs>()
    for (const log of recentLogs) {
      if (!logsByProduct.has(log.productId)) {
        logsByProduct.set(log.productId, [])
      }
      logsByProduct.get(log.productId)!.push(log)
    }

    // ✅ Calculate metrics for products
    const productsWithMetrics = products.map(product => {
      const logs = logsByProduct.get(product.id) || []
      const salesVelocity = product._count.orderItems
      const stockLevel = product.stock
      const inCarts = product._count.cartItems
      
      const urgencyScore = calculateUrgencyScore(stockLevel, threshold, salesVelocity, inCarts)
      const status = getStatus(stockLevel, threshold)

      const recentSales = logs
        .filter(log => log.reason === 'SALE')
        .reduce((sum, log) => sum + Math.abs(log.changeAmount), 0)
      
      const avgDailySales = recentSales / 30
      const daysUntilEmpty = avgDailySales > 0 ? Math.floor(stockLevel / avgDailySales) : null

      return {
        ...product,
        inventoryLogs: logs.slice(0, 5),
        urgencyScore: Math.round(urgencyScore),
        status,
        metrics: {
          salesLast30Days: recentSales,
          avgDailySales: Math.round(avgDailySales * 10) / 10,
          daysUntilEmpty,
          inCarts,
          totalOrders: salesVelocity
        }
      }
    })

    // ✅ Sort products
    const sortedProducts = [...productsWithMetrics]
    
    if (sortBy === 'urgency') {
      sortedProducts.sort((a, b) => b.urgencyScore - a.urgencyScore)
    } else if (sortBy === 'stock') {
      sortedProducts.sort((a, b) => a.stock - b.stock)
    } else if (sortBy === 'name') {
      sortedProducts.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'sales') {
      sortedProducts.sort((a, b) => b.metrics.salesLast30Days - a.metrics.salesLast30Days)
    }

    // ✅ OPTIMIZED: Fetch variants with issues
    let variantsWithIssues: any[] = []
    let totalVariants = 0
    
    if (includeVariants) {
      const variantWhere: Prisma.ProductVariantWhereInput = {
        isActive: true,
        product: {
          deletedAt: null,
          isActive: true
        }
      }

      if (type === 'low') {
        variantWhere.stock = { gt: 0, lte: threshold }
      } else if (type === 'out') {
        variantWhere.stock = 0
      } else {
        variantWhere.OR = [
          { stock: 0 },
          { stock: { gt: 0, lte: threshold } }
        ]
      }

      const [variants, variantCount] = await Promise.all([
        prisma.productVariant.findMany({
          where: variantWhere,
          select: {
            id: true,
            name: true,
            sku: true,
            stock: true,
            price: true,
            attributes: true,
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true
                  }
                },
                brand: {
                  select: {
                    id: true,
                    name: true,
                    slug: true
                  }
                }
              }
            },
            _count: {
              select: {
                orderItems: true,
                cartItems: true
              }
            }
          },
          orderBy: { stock: 'asc' },
          take: limit
        }),
        prisma.productVariant.count({ where: variantWhere })
      ])

      totalVariants = variantCount

      // Fetch variant logs
      const variantIds = variants.map(v => v.id)
      const variantLogs = await prisma.inventoryLog.findMany({
        where: {
          variantId: { in: variantIds },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        },
        select: {
          variantId: true,
          changeAmount: true,
          reason: true,
          createdAt: true,
          changedByUser: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      const logsByVariant = new Map<string, typeof variantLogs>()
      for (const log of variantLogs) {
        if (log.variantId) {
          if (!logsByVariant.has(log.variantId)) {
            logsByVariant.set(log.variantId, [])
          }
          logsByVariant.get(log.variantId)!.push(log)
        }
      }

      variantsWithIssues = variants.map(variant => {
        const logs = logsByVariant.get(variant.id) || []
        const salesVelocity = variant._count.orderItems
        const stockLevel = variant.stock
        const inCarts = variant._count.cartItems
        
        const urgencyScore = calculateUrgencyScore(stockLevel, threshold, salesVelocity, inCarts)
        const status = getStatus(stockLevel, threshold)

        const recentSales = logs
          .filter(log => log.reason === 'SALE')
          .reduce((sum, log) => sum + Math.abs(log.changeAmount), 0)
        
        const avgDailySales = recentSales / 30
        const daysUntilEmpty = avgDailySales > 0 ? Math.floor(stockLevel / avgDailySales) : null

        return {
          ...variant,
          inventoryLogs: logs.slice(0, 3),
          urgencyScore: Math.round(urgencyScore),
          status,
          metrics: {
            salesLast30Days: recentSales,
            avgDailySales: Math.round(avgDailySales * 10) / 10,
            daysUntilEmpty,
            inCarts,
            totalOrders: salesVelocity
          }
        }
      })

      if (sortBy === 'urgency') {
        variantsWithIssues.sort((a, b) => b.urgencyScore - a.urgencyScore)
      } else if (sortBy === 'stock') {
        variantsWithIssues.sort((a, b) => a.stock - b.stock)
      }
    }

    // ✅ OPTIMIZED: Parallel summary statistics
    const [
      allActiveProducts,
      productLowStock,
      productOutOfStock,
      allActiveVariants,
      variantLowStock,
      variantOutOfStock
    ] = await Promise.all([
      prisma.product.count({
        where: { deletedAt: null, isActive: true }
      }),
      prisma.product.count({
        where: {
          deletedAt: null,
          isActive: true,
          stock: { gt: 0, lte: threshold }
        }
      }),
      prisma.product.count({
        where: {
          deletedAt: null,
          isActive: true,
          stock: 0
        }
      }),
      includeVariants ? prisma.productVariant.count({
        where: {
          isActive: true,
          product: { deletedAt: null, isActive: true }
        }
      }) : 0,
      includeVariants ? prisma.productVariant.count({
        where: {
          isActive: true,
          product: { deletedAt: null, isActive: true },
          stock: { gt: 0, lte: threshold }
        }
      }) : 0,
      includeVariants ? prisma.productVariant.count({
        where: {
          isActive: true,
          product: { deletedAt: null, isActive: true },
          stock: 0
        }
      }) : 0
    ])

    const variantStats = includeVariants ? {
      total: allActiveVariants,
      lowStock: variantLowStock,
      outOfStock: variantOutOfStock,
      withIssues: variantLowStock + variantOutOfStock,
      percentageWithIssues: allActiveVariants > 0 
        ? Math.round(((variantLowStock + variantOutOfStock) / allActiveVariants) * 100)
        : 0
    } : null

    const summary = {
      threshold,
      products: {
        total: allActiveProducts,
        lowStock: productLowStock,
        outOfStock: productOutOfStock,
        withIssues: productLowStock + productOutOfStock,
        percentageWithIssues: allActiveProducts > 0 
          ? Math.round(((productLowStock + productOutOfStock) / allActiveProducts) * 100)
          : 0
      },
      variants: variantStats,
      overall: {
        totalItems: allActiveProducts + (variantStats?.total || 0),
        lowStock: productLowStock + (variantStats?.lowStock || 0),
        outOfStock: productOutOfStock + (variantStats?.outOfStock || 0),
        totalWithIssues: (productLowStock + productOutOfStock) + (variantStats ? variantStats.lowStock + variantStats.outOfStock : 0)
      },
      criticalCount: sortedProducts.filter(p => p.status === 'critical').length + 
                     (includeVariants ? variantsWithIssues.filter(v => v.status === 'critical').length : 0),
      urgentCount: sortedProducts.filter(p => p.status === 'urgent').length +
                   (includeVariants ? variantsWithIssues.filter(v => v.status === 'urgent').length : 0)
    }

    const headers = new Headers()
    headers.set('Cache-Control', 'private, no-cache')
    headers.set('X-Total-Products', String(totalProducts))
    headers.set('X-Total-Variants', String(totalVariants))

    return NextResponse.json({
      products: sortedProducts,
      variants: includeVariants ? variantsWithIssues : undefined,
      summary,
      pagination: {
        page,
        limit,
        totalProducts,
        totalVariants,
        hasMore: skip + limit < (totalProducts + (includeVariants ? totalVariants : 0))
      },
      filters: {
        type,
        threshold,
        sortBy,
        includeVariants
      },
      timestamp: new Date().toISOString()
    }, { headers })

  } catch (error) {
    console.error('Error fetching stock alerts:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch stock alerts',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/products/stock-alerts/bulk-update - Bulk update stock levels
 * 
 * Body: {
 *   updates: Array<{ productId?: string, variantId?: string, stock: number }>,
 *   reason?: string,
 *   notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
        
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const { updates, reason, notes } = await request.json()

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'Updates array is required and must not be empty' },
        { status: 400 }
      )
    }

    if (updates.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 updates allowed per request' },
        { status: 400 }
      )
    }

    // ✅ Validate all updates upfront
    for (const update of updates) {
      if (!update.productId && !update.variantId) {
        return NextResponse.json(
          { error: 'Each update must have either productId or variantId' },
          { status: 400 }
        )
      }

      if (typeof update.stock !== 'number' || update.stock < 0 || !Number.isInteger(update.stock)) {
        return NextResponse.json(
          { error: 'Stock must be a non-negative integer' },
          { status: 400 }
        )
      }
    }

    // ✅ CRITICAL: Fetch ALL current stocks OUTSIDE transaction
    const productIds = updates.filter(u => u.productId).map(u => u.productId)
    const variantIds = updates.filter(u => u.variantId).map(u => u.variantId)

    const [currentProducts, currentVariants] = await Promise.all([
      productIds.length > 0 ? prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, stock: true, name: true, sku: true, isActive: true, deletedAt: true }
      }) : Promise.resolve([]),
      variantIds.length > 0 ? prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true, stock: true, productId: true, name: true, sku: true, isActive: true }
      }) : Promise.resolve([])
    ])

    const productMap = new Map(currentProducts.map(p => [p.id, p]))
    const variantMap = new Map(currentVariants.map(v => [v.id, v]))

    // ✅ OPTIMIZED: Execute bulk update in single transaction
    const results = await prisma.$transaction(async (tx) => {
      const updatedItems: any[] = []
      const errors: any[] = []

      for (const update of updates) {
        try {
          const { productId, variantId, stock } = update

          if (variantId) {
            const currentVariant = variantMap.get(variantId)

            if (!currentVariant) {
              errors.push({ variantId, error: 'Variant not found' })
              continue
            }

            if (!currentVariant.isActive) {
              errors.push({ variantId, error: 'Variant is inactive' })
              continue
            }

            const stockChange = parseInt(stock.toString()) - currentVariant.stock

            await tx.productVariant.update({
              where: { id: variantId, stock: currentVariant.stock }, // Optimistic lock
              data: { 
                stock: parseInt(stock.toString()),
                updatedAt: new Date()
              }
            })

            // Create inventory log
            if (stockChange !== 0) {
              await tx.inventoryLog.create({
                data: {
                  productId: currentVariant.productId,
                  variantId: variantId,
                  changeAmount: stockChange,
                  newStock: parseInt(stock.toString()),
                  reason: reason || 'ADJUSTMENT_MANUAL',
                  notes: notes || `Bulk update: ${currentVariant.name} (${currentVariant.sku}) stock changed from ${currentVariant.stock} to ${stock}`,
                  changedByUserId: session.user.id
                }
              })
            }

            updatedItems.push({ 
              type: 'variant', 
              id: variantId, 
              name: currentVariant.name,
              sku: currentVariant.sku,
              previousStock: currentVariant.stock,
              newStock: parseInt(stock.toString()),
              change: stockChange
            })

          } else if (productId) {
            // Update product stock
            const currentProduct = await tx.product.findUnique({
              where: { id: productId },
              select: { 
                stock: true, 
                name: true, 
                sku: true,
                isActive: true,
                deletedAt: true 
              }
            })

            if (!currentProduct) {
              errors.push({ productId, error: 'Product not found' })
              continue
            }

            if (currentProduct.deletedAt) {
              errors.push({ productId, error: 'Product is deleted' })
              continue
            }

            if (!currentProduct.isActive) {
              errors.push({ productId, error: 'Product is inactive' })
              continue
            }

            const stockChange = parseInt(stock.toString()) - currentProduct.stock

            const updated = await tx.product.update({
              where: { id: productId },
              data: { 
                stock: parseInt(stock.toString()),
                updatedAt: new Date()
              }
            })

            // Create inventory log
            if (stockChange !== 0) {
              await tx.inventoryLog.create({
                data: {
                  productId: productId,
                  changeAmount: stockChange,
                  newStock: parseInt(stock.toString()),
                  reason: reason || 'ADJUSTMENT_MANUAL',
                  notes: notes || `Bulk update: ${currentProduct.name} stock changed from ${currentProduct.stock} to ${stock}`,
                  changedByUserId: session.user.id
                }
              })
            }

            updatedItems.push({ 
              type: 'product', 
              id: productId, 
              name: currentProduct.name,
              sku: currentProduct.sku,
              previousStock: currentProduct.stock,
              newStock: parseInt(stock.toString()),
              change: stockChange
            })
          }
        } catch (itemError: any) {
          errors.push({ 
            productId: update.productId, 
            variantId: update.variantId, 
            error: itemError.message 
          })
        }
      }

      return { updatedItems, errors }
    })

    const response: any = {
      success: true,
      summary: {
        requested: updates.length,
        successful: results.updatedItems.length,
        failed: results.errors.length
      },
      updated: results.updatedItems
    }

    if (results.errors.length > 0) {
      response.errors = results.errors
      response.success = results.updatedItems.length > 0 // Partial success
    }

    return NextResponse.json(response, { 
      status: results.errors.length > 0 && results.updatedItems.length === 0 ? 400 : 200 
    })

  } catch (error) {
    console.error('Error in bulk update:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update stock levels',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}