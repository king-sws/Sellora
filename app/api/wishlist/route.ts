// app/api/wishlist/route.ts
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
  isActive: true,
  category: {
    select: {
      id: true,
      name: true
    }
  }
} satisfies Prisma.ProductSelect

// GET /api/wishlist - Get user's wishlist
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const skip = (page - 1) * limit

    // Get wishlist items with product details
    const [items, totalCount] = await Promise.all([
      prisma.wishlistItem.findMany({
        where: {
          userId: session.user.id,
          product: {
            isActive: true,
            deletedAt: null
          }
        },
        select: {
          id: true,
          createdAt: true,
          product: {
            select: productSelect
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),

      prisma.wishlistItem.count({
        where: {
          userId: session.user.id,
          product: {
            isActive: true,
            deletedAt: null
          }
        }
      })
    ])

    // Format response
    const formattedItems = items.map(item => ({
      id: item.id,
      productId: item.product.id,
      addedAt: item.createdAt.toISOString(),
      product: {
        ...item.product,
        salePrice: item.product.comparePrice && 
                   item.product.comparePrice < item.product.price
          ? item.product.comparePrice
          : undefined
      }
    }))

    const totalPages = Math.ceil(totalCount / limit)

    const response = NextResponse.json({
      items: formattedItems,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })

    // Add cache headers
    response.headers.set('Cache-Control', 'private, max-age=60')
    
    return response
  } catch (error) {
    console.error('Error fetching wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wishlist' },
      { status: 500 }
    )
  }
}

// POST /api/wishlist - Add item to wishlist
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { productId } = body

    if (!productId || typeof productId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      )
    }

    // Verify product exists and is active
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        name: true
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found or unavailable' },
        { status: 404 }
      )
    }

    // Check if already in wishlist
    const existingItem = await prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId
        }
      }
    })

    if (existingItem) {
      return NextResponse.json(
        { error: 'Product already in wishlist' },
        { status: 409 }
      )
    }

    // Add to wishlist
    const wishlistItem = await prisma.wishlistItem.create({
      data: {
        userId: session.user.id,
        productId
      },
      select: {
        id: true,
        createdAt: true,
        product: {
          select: productSelect
        }
      }
    })

    return NextResponse.json({
      id: wishlistItem.id,
      productId: wishlistItem.product.id,
      addedAt: wishlistItem.createdAt.toISOString(),
      product: {
        ...wishlistItem.product,
        salePrice: wishlistItem.product.comparePrice && 
                   wishlistItem.product.comparePrice < wishlistItem.product.price
          ? wishlistItem.product.comparePrice
          : undefined
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error adding to wishlist:', error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Product already in wishlist' },
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to add to wishlist' },
      { status: 500 }
    )
  }
}

// DELETE /api/wishlist - Clear entire wishlist
export async function DELETE() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const deletedCount = await prisma.wishlistItem.deleteMany({
      where: { userId: session.user.id }
    })

    return NextResponse.json({ 
      message: 'Wishlist cleared successfully',
      deletedCount: deletedCount.count
    })
  } catch (error) {
    console.error('Error clearing wishlist:', error)
    return NextResponse.json(
      { error: 'Failed to clear wishlist' },
      { status: 500 }
    )
  }
}
