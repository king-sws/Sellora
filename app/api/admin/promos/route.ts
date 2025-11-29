// app/api/admin/promos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const promos = await prisma.promoModal.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ promos });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch promos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    const promo = await prisma.promoModal.create({
      data: {
        title: data.title,
        description: data.description,
        discountValue: data.discountValue,
        couponCode: data.couponCode,
        buttonText: data.buttonText || 'Shop Now',
        buttonLink: data.buttonLink || '/',
        primaryColor: data.primaryColor || '#dc2626',
        image: data.image,
        isActive: data.isActive ?? true,
        showOnPages: data.showOnPages || ['home'],
        delaySeconds: data.delaySeconds || 1,
        features: data.features,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        termsText: data.termsText || '*Terms and conditions apply'
      }
    });

    return NextResponse.json({ promo });
  } catch (error) {
    console.error('Error creating promo:', error);
    return NextResponse.json({ error: 'Failed to create promo' }, { status: 500 });
  }
}