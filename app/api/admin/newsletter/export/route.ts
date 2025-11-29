/* eslint-disable @typescript-eslint/no-explicit-any */
// Export newsletter emails (Admin only)

import { auth } from "@/auth";
import { prisma } from "@/db/prisma";
import { NextRequest, NextResponse } from "next/server";

// app/api/admin/newsletter/export/route.ts
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { isActive } = await req.json();

    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const subscriptions = await prisma.newsletterSubscription.findMany({
      where,
      select: {
        email: true,
        isActive: true,
        createdAt: true,
        confirmedAt: true,
        unsubscribedAt: true,
        source: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Convert to CSV
    const csvHeader = 'Email,Status,Subscribed At,Confirmed At,Unsubscribed At,Source\n';
    const csvRows = subscriptions.map(sub => 
      `${sub.email},${sub.isActive ? 'Active' : 'Inactive'},${sub.createdAt.toISOString()},${sub.confirmedAt?.toISOString() || ''},${sub.unsubscribedAt?.toISOString() || ''},${sub.source || ''}`
    ).join('\n');

    const csv = csvHeader + csvRows;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error('Error exporting newsletter subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to export subscriptions' },
      { status: 500 }
    );
  }
}