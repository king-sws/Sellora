// app/api/account/stats/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all order statistics
    const orders = await prisma.order.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null
      },
      select: {
        total: true,
        status: true
      }
    });

    // Get wishlist count
    const wishlistCount = await prisma.wishlistItem.count({
      where: {
        userId: session.user.id
      }
    });

    // Calculate stats
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
    const pendingOrders = orders.filter(o => 
      ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(o.status)
    ).length;
    const completedOrders = orders.filter(o => o.status === 'DELIVERED').length;

    return NextResponse.json({
      totalOrders,
      totalSpent,
      averageOrderValue,
      pendingOrders,
      completedOrders,
      wishlistCount
    });
  } catch (error) {
    console.error('Error fetching account stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account statistics' },
      { status: 500 }
    );
  }
}