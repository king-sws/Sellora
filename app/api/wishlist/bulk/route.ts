

// app/api/wishlist/bulk/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'

// POST /api/wishlist/bulk - Add multiple items to wishlist
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productIds } = body

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'Product IDs array required' },
        { status: 400 }
      )
    }

    if (productIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 items allowed at once' },
        { status: 400 }
      )
    }

    // Verify all products exist and are active
    const validProducts = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
        deletedAt: null
      },
      select: { id: true }
    })

    if (validProducts.length !== productIds.length) {
      return NextResponse.json(
        { error: 'Some products not found or unavailable' },
        { status: 400 }
      )
    }

    // Get existing wishlist items to avoid duplicates
    const existingItems = await prisma.wishlistItem.findMany({
      where: {
        userId: session.user.id,
        productId: { in: productIds }
      },
      select: { productId: true }
    })

    const existingProductIds = new Set(existingItems.map(item => item.productId))
    const newProductIds = productIds.filter(id => !existingProductIds.has(id))

    if (newProductIds.length === 0) {
      return NextResponse.json(
        { error: 'All products already in wishlist' },
        { status: 409 }
      )
    }

    // Bulk insert new items
    const wishlistItems = await prisma.wishlistItem.createMany({
      data: newProductIds.map(productId => ({
        userId: session.user.id,
        productId
      })),
      skipDuplicates: true
    })

    return NextResponse.json({
      message: `${wishlistItems.count} items added to wishlist`,
      addedCount: wishlistItems.count,
      skippedCount: productIds.length - wishlistItems.count
    }, { status: 201 })
  } catch (error) {
    console.error('Error bulk adding to wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to add items to wishlist' },
      { status: 500 }
    )
  }
}

// DELETE /api/wishlist/bulk - Remove multiple items
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productIds } = body

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'Product IDs array required' },
        { status: 400 }
      )
    }

    const result = await prisma.wishlistItem.deleteMany({
      where: {
        userId: session.user.id,
        productId: { in: productIds }
      }
    })

    return NextResponse.json({
      message: `${result.count} items removed from wishlist`,
      removedCount: result.count
    })
  } catch (error) {
    console.error('Error bulk removing from wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to remove items from wishlist' },
      { status: 500 }
    )
  }
}