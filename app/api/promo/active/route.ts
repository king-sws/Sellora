// app/api/promo/active/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

export async function GET() {
  try {
    const now = new Date();
    
    const promo = await prisma.promoModal.findFirst({
      where: {
        isActive: true,
        OR: [
          { startsAt: null, expiresAt: null },
          { startsAt: { lte: now }, expiresAt: { gte: now } },
          { startsAt: { lte: now }, expiresAt: null },
          { startsAt: null, expiresAt: { gte: now } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ promo });
  } catch (error) {
    console.error('Error fetching promo:', error);
    return NextResponse.json({ promo: null });
  }
}