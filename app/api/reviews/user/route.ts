// app/api/reviews/user/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'

// GET /api/reviews/user - Get current user's review for a product
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const review = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id!,
          productId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    })

    if (!review) {
      return NextResponse.json(null)
    }

    return NextResponse.json(review)
  } catch (error) {
    console.error('Error fetching user review:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user review' },
      { status: 500 }
    )
  }
}

// PUT /api/reviews/user - Update user's review
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { productId, rating, title, comment } = await request.json()

    // Validation
    if (!productId || !rating) {
      return NextResponse.json(
        { error: 'Product ID and rating are required' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Check if review exists
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id!,
          productId
        }
      }
    })

    if (!existingReview) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    const review = await prisma.review.update({
      where: {
        userId_productId: {
          userId: session.user.id!,
          productId
        }
      },
      data: {
        rating,
        title: title?.trim() || null,
        comment: comment?.trim() || null,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    })

    return NextResponse.json(review)
  } catch (error) {
    console.error('Error updating review:', error)
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    )
  }
}

// DELETE /api/reviews/user - Delete user's review
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Check if review exists
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id!,
          productId
        }
      }
    })

    if (!existingReview) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    await prisma.review.delete({
      where: {
        userId_productId: {
          userId: session.user.id!,
          productId
        }
      }
    })

    return NextResponse.json({ message: 'Review deleted successfully' })
  } catch (error) {
    console.error('Error deleting review:', error)
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    )
  }
}