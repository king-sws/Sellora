// app/api/cart/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'
import { Prisma } from '@prisma/client'

const productSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  comparePrice: true,
  stock: true,
  sku: true,
  images: true,
  category: {
    select: { id: true, name: true }
  }
} satisfies Prisma.ProductSelect

// PUT /api/cart/[id] - Update quantity with optimistic locking
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { quantity } = await request.json()

    // Validate quantity
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return NextResponse.json(
        { error: 'Quantity must be between 1 and 99' },
        { status: 400 }
      )
    }

    // Fetch cart item with product in single query
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      select: {
        id: true,
        quantity: true,
        productId: true,
        product: {
          select: {
            stock: true,
            isActive: true,
            deletedAt: true
          }
        }
      }
    })

    if (!cartItem) {
      return NextResponse.json(
        { error: 'Cart item not found' },
        { status: 404 }
      )
    }

    // Validate product is still available
    if (!cartItem.product.isActive || cartItem.product.deletedAt) {
      await prisma.cartItem.delete({ where: { id: params.id } })
      return NextResponse.json(
        { error: 'Product is no longer available' },
        { status: 410 }
      )
    }

    // Check stock availability
    if (quantity > cartItem.product.stock) {
      return NextResponse.json({
        error: cartItem.product.stock === 0
          ? 'Product is out of stock'
          : `Only ${cartItem.product.stock} items available`,
        availableStock: cartItem.product.stock
      }, { status: 400 })
    }

    // Update with optimistic concurrency
    const updatedItem = await prisma.cartItem.update({
      where: { 
        id: params.id,
        userId: session.user.id // Double-check ownership
      },
      data: { 
        quantity,
        updatedAt: new Date()
      },
      select: {
        id: true,
        quantity: true,
        createdAt: true,
        product: {
          select: productSelect
        }
      }
    })

    return NextResponse.json({
      id: updatedItem.id,
      quantity: updatedItem.quantity,
      product: {
        ...updatedItem.product,
        salePrice: updatedItem.product.comparePrice && 
                   updatedItem.product.comparePrice < updatedItem.product.price
          ? updatedItem.product.comparePrice
          : undefined
      },
      addedAt: updatedItem.createdAt.toISOString()
    })
  } catch (error) {
    console.error('Error updating cart item:', error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Cart item not found' },
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to update cart item' },
      { status: 500 }
    )
  }
}

// DELETE /api/cart/[id] - Remove item with validation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete only if user owns the cart item
    const result = await prisma.cartItem.deleteMany({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (result.count === 0) {
      return NextResponse.json(
        { error: 'Cart item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Item removed from cart' 
    })
  } catch (error) {
    console.error('Error removing cart item:', error)
    return NextResponse.json(
      { error: 'Failed to remove cart item' },
      { status: 500 }
    )
  }
}