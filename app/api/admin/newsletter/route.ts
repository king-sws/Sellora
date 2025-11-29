// app/api/admin/newsletter/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';


// Get all newsletter subscriptions (Admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    // Check if user is admin
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.email = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Get subscriptions
    const [subscriptions, total] = await Promise.all([
      prisma.newsletterSubscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.newsletterSubscription.count({ where }),
    ]);

    // Get statistics
    const stats = await prisma.newsletterSubscription.groupBy({
      by: ['isActive'],
      _count: true,
    });

    const activeCount = stats.find(s => s.isActive)?._count || 0;
    const inactiveCount = stats.find(s => !s.isActive)?._count || 0;

    return NextResponse.json({
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total,
        active: activeCount,
        inactive: inactiveCount,
      },
    });

  } catch (error) {
    console.error('Error fetching newsletter subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}

