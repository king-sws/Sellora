/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/admin/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'

// GET /api/admin/reviews - Get all reviews for admin
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search')
    const rating = searchParams.get('rating')
    const verified = searchParams.get('verified')
    const productId = searchParams.get('productId')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    
    const skip = (page - 1) * limit

    const where: any = {}

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { comment: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { product: { name: { contains: search, mode: 'insensitive' } } }
      ]
    }

    // Rating filter
    if (rating) {
      if (rating === '5') {
        where.rating = 5
      } else if (rating === '4+') {
        where.rating = { gte: 4 }
      } else if (rating === '3') {
        where.rating = 3
      } else if (rating === '1-2') {
        where.rating = { lte: 2 }
      } else {
        where.rating = parseInt(rating)
      }
    }

    // Verified filter
    if (verified === 'true') {
      where.isVerified = true
    } else if (verified === 'false') {
      where.isVerified = false
    }

    // Product filter
    if (productId) {
      where.productId = productId
    }

    // Build orderBy object
    const orderBy: any = {}
    if (sortBy === 'rating') {
      orderBy.rating = sortOrder
    } else if (sortBy === 'verified') {
      orderBy.isVerified = sortOrder
    } else if (sortBy === 'user') {
      orderBy.user = { name: sortOrder }
    } else if (sortBy === 'product') {
      orderBy.product = { name: sortOrder }
    } else {
      orderBy.createdAt = sortOrder
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              images: true,
              price: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.review.count({ where })
    ])

    // Get summary statistics
    const stats = await prisma.review.aggregate({
      _avg: { rating: true },
      _count: { 
        _all: true,
        isVerified: true
      }
    })

    const ratingDistribution = await prisma.review.groupBy({
      by: ['rating'],
      _count: { rating: true },
      orderBy: { rating: 'desc' }
    })

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        totalReviews: stats._count._all,
        averageRating: stats._avg.rating || 0,
        verifiedReviews: stats._count.isVerified,
        verificationRate: stats._count._all > 0 ? ((stats._count.isVerified || 0) / stats._count._all * 100) : 0,
        ratingDistribution: ratingDistribution.reduce((acc, item) => {
          acc[item.rating] = item._count.rating
          return acc
        }, {} as Record<number, number>)
      }
    })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/reviews - Delete review (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = request.nextUrl
    const reviewId = searchParams.get('id')

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      )
    }

    await prisma.review.delete({
      where: { id: reviewId }
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

// PATCH /api/admin/reviews - Update review verification status
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { reviewId, isVerified } = await request.json()

    if (!reviewId) {
      return NextResponse.json(
        { error: 'Review ID is required' },
        { status: 400 }
      )
    }

    const review = await prisma.review.update({
      where: { id: reviewId },
      data: { isVerified: Boolean(isVerified) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true
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