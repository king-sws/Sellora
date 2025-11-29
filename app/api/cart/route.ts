/* eslint-disable @typescript-eslint/no-unused-vars */
// app/api/cart/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'
import { Prisma } from '@prisma/client'

// Cache configuration
const CACHE_DURATION = 60 // seconds

// Optimized product selection to reduce payload
const productSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  comparePrice: true,
  stock: true,
  sku: true,
  images: true,
  isActive: true,
  category: {
    select: {
      id: true,
      name: true
    }
  }
} satisfies Prisma.ProductSelect

// GET /api/cart - Get user's cart with optimizations
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parallel queries for better performance
    const [cartItems, expiredCount] = await Promise.all([
      // Get active cart items
      prisma.cartItem.findMany({
        where: {
          userId: session.user.id,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ],
          product: {
            isActive: true,
            deletedAt: null
          }
        },
        select: {
          id: true,
          quantity: true,
          createdAt: true,
          product: {
            select: productSelect
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100 // Limit to prevent abuse
      }),
      
      // Clean up expired items (non-blocking)
      prisma.cartItem.deleteMany({
        where: {
          userId: session.user.id,
          expiresAt: { lte: new Date() }
        }
      })
    ])

    // Calculate totals efficiently
    let subtotal = 0
    let totalItems = 0
    const processedItems = []

    for (const item of cartItems) {
      // Use comparePrice if available for sale pricing
      const itemPrice = item.product.comparePrice 
        ? Math.min(item.product.price, item.product.comparePrice)
        : item.product.price
      
      // Validate quantity against stock
      const validQuantity = Math.min(item.quantity, item.product.stock)
      
      subtotal += itemPrice * validQuantity
      totalItems += validQuantity

      processedItems.push({
        id: item.id,
        quantity: validQuantity,
        product: {
          ...item.product,
          salePrice: item.product.comparePrice && item.product.comparePrice < item.product.price
            ? item.product.comparePrice
            : undefined
        },
        addedAt: item.createdAt.toISOString()
      })
    }

    // Calculate shipping (free over $50)
    const shipping = subtotal >= 50 ? 0 : 9.99
    const tax = subtotal * 0.08 // 8% tax
    const total = subtotal + tax + shipping

    const response = NextResponse.json({
      items: processedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      totalItems,
      tax: Math.round(tax * 100) / 100,
      shipping: Math.round(shipping * 100) / 100,
      discount: 0,
      total: Math.round(total * 100) / 100,
      freeShippingThreshold: 50,
      savedItems: []
    })

    // Add cache headers
    response.headers.set('Cache-Control', `private, max-age=${CACHE_DURATION}`)
    
    return response
  } catch (error) {
    console.error('Error fetching cart:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cart' },
      { status: 500 }
    )
  }
}

// POST /api/cart - Add item with validation and deduplication
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, quantity = 1, variantId, skipStockCheck = false } = body

    // Validate input
    if (!productId || typeof productId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      )
    }

    if (quantity < 1 || quantity > 99) {
      return NextResponse.json(
        { error: 'Quantity must be between 1 and 99' },
        { status: 400 }
      )
    }

    // Check product availability with minimal data fetch
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        stock: true,
        name: true
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found or unavailable' },
        { status: 404 }
      )
    }

    // Stock validation
    if (!skipStockCheck && product.stock < quantity) {
      return NextResponse.json({
        error: product.stock === 0
          ? 'Product is out of stock'
          : `Only ${product.stock} items available`
      }, { status: 400 })
    }

    // ✅ FIX: Check if cart item exists first
    const existingCartItem = await prisma.cartItem.findFirst({
      where: {
        userId: session.user.id,
        productId,
        variantId: variantId || null
      },
      select: {
        id: true,
        quantity: true
      }
    })

    let cartItem

    if (existingCartItem) {
      // Update existing cart item
      const newQuantity = existingCartItem.quantity + quantity

      // Check if new quantity exceeds stock
      if (!skipStockCheck && newQuantity > product.stock) {
        // Cap at available stock
        cartItem = await prisma.cartItem.update({
          where: {
            id: existingCartItem.id
          },
          data: {
            quantity: product.stock,
            updatedAt: new Date()
          },
          select: {
            id: true,
            quantity: true,
            product: {
              select: productSelect
            }
          }
        })

        return NextResponse.json({
          error: `Updated to maximum available quantity: ${product.stock}`,
          cartItem
        }, { status: 400 })
      }

      // Update with new quantity
      cartItem = await prisma.cartItem.update({
        where: {
          id: existingCartItem.id
        },
        data: {
          quantity: newQuantity,
          updatedAt: new Date()
        },
        select: {
          id: true,
          quantity: true,
          product: {
            select: productSelect
          }
        }
      })
    } else {
      // Create new cart item
      cartItem = await prisma.cartItem.create({
        data: {
          userId: session.user.id,
          productId,
          variantId: variantId || null,
          quantity,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        select: {
          id: true,
          quantity: true,
          product: {
            select: productSelect
          }
        }
      })
    }

    return NextResponse.json(cartItem, { status: 201 })
  } catch (error) {
    console.error('Error adding to cart:', error)
    
    // Provide more detailed error for debugging
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma Error Code:', error.code)
      console.error('Prisma Error Meta:', error.meta)
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to add to cart',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : String(error))
          : undefined
      },
      { status: 500 }
    )
  }
}

// DELETE /api/cart - Clear entire cart
export async function DELETE() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.cartItem.deleteMany({
      where: { userId: session.user.id }
    })

    return NextResponse.json({ message: 'Cart cleared successfully' })
  } catch (error) {
    console.error('Error clearing cart:', error)
    return NextResponse.json(
      { error: 'Failed to clear cart' },
      { status: 500 }
    )
  }
}