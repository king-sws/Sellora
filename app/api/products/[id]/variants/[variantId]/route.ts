/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/products/[id]/variants/[variantId]/route.ts - Complete CRUD
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'
import { Prisma } from '@prisma/client'

// GET /api/products/[id]/variants/[variantId] - Get single variant
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const { variantId } = await params

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            images: true,
            category: true,
            brand: true
          }
        },
        inventoryLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            changedByUser: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            orderItems: true,
            cartItems: true,
            inventoryLogs: true
          }
        }
      }
    })

    if (!variant) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(variant)
  } catch (error) {
    console.error('Error fetching variant:', error)
    return NextResponse.json(
      { error: 'Failed to fetch variant' },
      { status: 500 }
    )
  }
}

// PUT /api/products/[id]/variants/[variantId] - Update variant
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const session = await auth()
        
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id, variantId } = await params
    const data = await request.json()

    // Get current variant to track changes
    const currentVariant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { 
        stock: true,
        sku: true,
        productId: true
      }
    })

    if (!currentVariant) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      )
    }

    if (currentVariant.productId !== id) {
      return NextResponse.json(
        { error: 'Variant does not belong to this product' },
        { status: 400 }
      )
    }

    // Check SKU uniqueness if changed
    if (data.sku && data.sku !== currentVariant.sku) {
      const existingSku = await prisma.productVariant.findFirst({
        where: {
          sku: data.sku,
          id: { not: variantId }
        }
      })

      if (existingSku) {
        return NextResponse.json(
          { error: 'A variant with this SKU already exists' },
          { status: 400 }
        )
      }
    }

    // Calculate stock changes
    const newStock = data.stock !== undefined ? parseInt(data.stock) : currentVariant.stock
    const stockChange = newStock - currentVariant.stock
    const hasStockChange = stockChange !== 0

    // Update with transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedVariant = await tx.productVariant.update({
        where: { id: variantId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.sku !== undefined && { sku: data.sku || null }),
          ...(data.price !== undefined && { price: parseFloat(data.price) }),
          ...(data.comparePrice !== undefined && { 
            comparePrice: data.comparePrice ? parseFloat(data.comparePrice) : null 
          }),
          ...(data.stock !== undefined && { stock: newStock }),
          ...(data.attributes !== undefined && { attributes: data.attributes }),
          ...(data.images !== undefined && { images: data.images }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          updatedAt: new Date()
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      })

      // Log stock change
      if (hasStockChange) {
        await tx.inventoryLog.create({
          data: {
            productId: id,
            variantId: variantId,
            changeAmount: stockChange,
            newStock: newStock,
            reason: data.inventoryReason || 'ADJUSTMENT_MANUAL',
            notes: data.inventoryNotes || 
              `Variant stock updated from ${currentVariant.stock} to ${newStock}`,
            changedByUserId: session.user.id!
          }
        })
      }

      return updatedVariant
    })

    return NextResponse.json({
      ...result,
      message: 'Variant updated successfully',
      stockChanged: hasStockChange,
      stockChange: hasStockChange ? stockChange : undefined
    })
  } catch (error) {
    console.error('Error updating variant:', error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'A variant with this SKU already exists' },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to update variant' },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id]/variants/[variantId] - Delete variant
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const session = await auth()
        
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id, variantId } = await params

    // Check variant exists and belongs to product
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { 
        id: true,
        name: true,
        productId: true,
        _count: {
          select: {
            orderItems: true,
            cartItems: true
          }
        }
      }
    })

    if (!variant) {
      return NextResponse.json(
        { error: 'Variant not found' },
        { status: 404 }
      )
    }

    if (variant.productId !== id) {
      return NextResponse.json(
        { error: 'Variant does not belong to this product' },
        { status: 400 }
      )
    }

    // Check if variant is in use
    if (variant._count.orderItems > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete variant with existing orders',
          suggestion: 'Consider deactivating it instead'
        },
        { status: 400 }
      )
    }

    // Delete variant
    await prisma.productVariant.delete({
      where: { id: variantId }
    })

    return NextResponse.json({
      message: 'Variant deleted successfully',
      variantName: variant.name,
      warnings: {
        wasInCarts: variant._count.cartItems > 0
      }
    })
  } catch (error) {
    console.error('Error deleting variant:', error)
    
    return NextResponse.json(
      { error: 'Failed to delete variant' },
      { status: 500 }
    )
  }
}