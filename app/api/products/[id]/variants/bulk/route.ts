/* eslint-disable @typescript-eslint/no-explicit-any */

// ========================================
// BULK OPERATIONS
// ========================================

// app/api/products/[id]/variants/bulk/route.ts
// POST /api/products/[id]/variants/bulk - Bulk operations on variants

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'

interface BulkVariantOperation {
  action: 'create' | 'update' | 'delete' | 'updateStock'
  variantId?: string
  data?: any
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
        
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const { operations } = await request.json() as { operations: BulkVariantOperation[] }

    if (!Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json(
        { error: 'Operations array is required' },
        { status: 400 }
      )
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const results = {
      created: [] as any[],
      updated: [] as any[],
      deleted: [] as string[],
      errors: [] as any[]
    }

    // Process operations in transaction
    await prisma.$transaction(async (tx) => {
      for (const [index, operation] of operations.entries()) {
        try {
          switch (operation.action) {
            case 'create': {
              if (!operation.data?.sku || !operation.data?.name) {
                results.errors.push({
                  index,
                  error: 'SKU and name are required for create'
                })
                continue
              }

              const variant = await tx.productVariant.create({
                data: {
                  productId: id,
                  sku: operation.data.sku,
                  name: operation.data.name,
                  price: operation.data.price ? parseFloat(operation.data.price) : null,
                  comparePrice: operation.data.comparePrice ? parseFloat(operation.data.comparePrice) : null,
                  stock: parseInt(operation.data.stock || '0'),
                  attributes: operation.data.attributes || {},
                  images: operation.data.images || [],
                  isActive: operation.data.isActive !== false
                }
              })

              // Create inventory log if stock > 0
              if (variant.stock > 0) {
                await tx.inventoryLog.create({
                  data: {
                    productId: id,
                    variantId: variant.id,
                    changeAmount: variant.stock,
                    newStock: variant.stock,
                    reason: 'RECEIVING',
                    notes: `Initial stock for bulk-created variant: ${variant.name}`,
                    changedByUserId: session.user.id!
                  }
                })
              }

              results.created.push(variant)
              break
            }

            case 'update': {
              if (!operation.variantId) {
                results.errors.push({
                  index,
                  error: 'variantId is required for update'
                })
                continue
              }

              const currentVariant = await tx.productVariant.findUnique({
                where: { id: operation.variantId },
                select: { stock: true, productId: true }
              })

              if (!currentVariant || currentVariant.productId !== id) {
                results.errors.push({
                  index,
                  error: 'Variant not found or does not belong to product'
                })
                continue
              }

              const newStock = operation.data?.stock !== undefined 
                ? parseInt(operation.data.stock) 
                : currentVariant.stock
              const stockChange = newStock - currentVariant.stock

              const variant = await tx.productVariant.update({
                where: { id: operation.variantId },
                data: {
                  ...(operation.data?.name && { name: operation.data.name }),
                  ...(operation.data?.sku && { sku: operation.data.sku }),
                  ...(operation.data?.price !== undefined && { 
                    price: parseFloat(operation.data.price) 
                  }),
                  ...(operation.data?.comparePrice !== undefined && { 
                    comparePrice: operation.data.comparePrice ? parseFloat(operation.data.comparePrice) : null 
                  }),
                  ...(operation.data?.stock !== undefined && { stock: newStock }),
                  ...(operation.data?.attributes && { attributes: operation.data.attributes }),
                  ...(operation.data?.images && { images: operation.data.images }),
                  ...(operation.data?.isActive !== undefined && { isActive: operation.data.isActive }),
                  updatedAt: new Date()
                }
              })

              // Log stock change
              if (stockChange !== 0) {
                await tx.inventoryLog.create({
                  data: {
                    productId: id,
                    variantId: operation.variantId,
                    changeAmount: stockChange,
                    newStock: newStock,
                    reason: 'ADJUSTMENT_MANUAL',
                    notes: `Bulk update: Stock changed from ${currentVariant.stock} to ${newStock}`,
                    changedByUserId: session.user.id!
                  }
                })
              }

              results.updated.push(variant)
              break
            }

            case 'delete': {
              if (!operation.variantId) {
                results.errors.push({
                  index,
                  error: 'variantId is required for delete'
                })
                continue
              }

              const variant = await tx.productVariant.findUnique({
                where: { id: operation.variantId },
                select: {
                  productId: true,
                  _count: {
                    select: { orderItems: true }
                  }
                }
              })

              if (!variant || variant.productId !== id) {
                results.errors.push({
                  index,
                  error: 'Variant not found or does not belong to product'
                })
                continue
              }

              if (variant._count.orderItems > 0) {
                results.errors.push({
                  index,
                  error: 'Cannot delete variant with existing orders'
                })
                continue
              }

              await tx.productVariant.delete({
                where: { id: operation.variantId }
              })

              results.deleted.push(operation.variantId)
              break
            }

            case 'updateStock': {
              if (!operation.variantId || operation.data?.stockChange === undefined) {
                results.errors.push({
                  index,
                  error: 'variantId and stockChange are required'
                })
                continue
              }

              const currentVariant = await tx.productVariant.findUnique({
                where: { id: operation.variantId },
                select: { stock: true, productId: true, name: true }
              })

              if (!currentVariant || currentVariant.productId !== id) {
                results.errors.push({
                  index,
                  error: 'Variant not found or does not belong to product'
                })
                continue
              }

              const stockChange = parseInt(operation.data.stockChange)
              const newStock = Math.max(0, currentVariant.stock + stockChange)

              const variant = await tx.productVariant.update({
                where: { id: operation.variantId },
                data: {
                  stock: newStock,
                  updatedAt: new Date()
                }
              })

              await tx.inventoryLog.create({
                data: {
                  productId: id,
                  variantId: operation.variantId,
                  changeAmount: stockChange,
                  newStock: newStock,
                  reason: operation.data.reason || 'ADJUSTMENT_MANUAL',
                  notes: operation.data.notes || `Bulk stock adjustment for ${currentVariant.name}`,
                  changedByUserId: session.user.id!
                }
              })

              results.updated.push(variant)
              break
            }

            default:
              results.errors.push({
                index,
                error: `Unknown action: ${operation.action}`
              })
          }
        } catch (error) {
          results.errors.push({
            index,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }, {
      maxWait: 15000,
      timeout: 30000
    })

    return NextResponse.json({
      message: 'Bulk operations completed',
      results,
      summary: {
        created: results.created.length,
        updated: results.updated.length,
        deleted: results.deleted.length,
        errors: results.errors.length,
        total: operations.length
      }
    })
  } catch (error) {
    console.error('Error in bulk variant operations:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process bulk operations',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}