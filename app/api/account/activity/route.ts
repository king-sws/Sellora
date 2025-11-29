// app/api/account/activity/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Fetch recent activities from different sources
    const [recentOrders, recentReviews, recentWishlist, recentAddresses] = await Promise.all([
      // Recent orders
      prisma.order.findMany({
        where: {
          userId: session.user.id,
          deletedAt: null
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      }),
      
      // Recent reviews
      prisma.review.findMany({
        where: {
          userId: session.user.id
        },
        select: {
          id: true,
          rating: true,
          product: {
            select: {
              name: true
            }
          },
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      }),
      
      // Recent wishlist additions
      prisma.wishlistItem.findMany({
        where: {
          userId: session.user.id
        },
        select: {
          id: true,
          product: {
            select: {
              name: true
            }
          },
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      }),
      
      // Recent addresses
      prisma.address.findMany({
        where: {
          userId: session.user.id
        },
        select: {
          id: true,
          city: true,
          state: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      })
    ]);

    // Combine and format activities
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activities: any[] = [];

    recentOrders.forEach(order => {
      activities.push({
        id: `order-${order.id}`,
        type: 'ORDER',
        description: `Order #${order.orderNumber} placed - ${order.total.toFixed(2)} (${order.status})`,
        timestamp: order.createdAt.toISOString(),
        metadata: { orderId: order.id, orderNumber: order.orderNumber }
      });
    });

    recentReviews.forEach(review => {
      activities.push({
        id: `review-${review.id}`,
        type: 'REVIEW',
        description: `Reviewed ${review.product.name} - ${review.rating} stars`,
        timestamp: review.createdAt.toISOString(),
        metadata: { reviewId: review.id }
      });
    });

    recentWishlist.forEach(item => {
      activities.push({
        id: `wishlist-${item.id}`,
        type: 'WISHLIST',
        description: `Added ${item.product.name} to wishlist`,
        timestamp: item.createdAt.toISOString(),
        metadata: { wishlistItemId: item.id }
      });
    });

    recentAddresses.forEach(address => {
      activities.push({
        id: `address-${address.id}`,
        type: 'ADDRESS',
        description: `Added new address in ${address.city}, ${address.state}`,
        timestamp: address.createdAt.toISOString(),
        metadata: { addressId: address.id }
      });
    });

    // Sort by timestamp (most recent first) and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return NextResponse.json({ activities: sortedActivities });
  } catch (error) {
    console.error('Error fetching account activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account activity' },
      { status: 500 }
    );
  }
}