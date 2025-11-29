// app/api/newsletter/subscribe/route.ts
import { auth } from '@/auth';
import { prisma } from '@/db/prisma';
import { SendNewsletterSubscriptionEmail } from '@/nodemailer/email';
import { NextRequest, NextResponse } from 'next/server';


export async function POST(req: NextRequest) {
  try {
    const { email, source, utmSource, utmMedium, utmCampaign } = await req.json();

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Get session to link user if logged in
    const session = await auth();
    const userId = session?.user?.id || null;

    // Get IP and User Agent
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;
    const userAgent = req.headers.get('user-agent') || null;

    // Check if already subscribed
    const existingSubscription = await prisma.newsletterSubscription.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingSubscription) {
      // If previously unsubscribed, reactivate
      if (!existingSubscription.isActive) {
        await prisma.newsletterSubscription.update({
          where: { email: normalizedEmail },
          data: {
            isActive: true,
            unsubscribedAt: null,
            unsubscribeReason: null,
            confirmedAt: new Date(),
            userId: userId || existingSubscription.userId,
          },
        });

        await SendNewsletterSubscriptionEmail(normalizedEmail);

        return NextResponse.json(
          { 
            success: true, 
            message: 'Welcome back! You have been resubscribed to our newsletter.' 
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: 'This email is already subscribed to our newsletter' },
        { status: 409 }
      );
    }

    // Create new subscription
    await prisma.newsletterSubscription.create({
      data: {
        email: normalizedEmail,
        userId,
        isActive: true,
        confirmedAt: new Date(),
        source: source || 'website',
        utmSource,
        utmMedium,
        utmCampaign,
        ipAddress,
        userAgent,
      },
    });

    // Send confirmation email
    await SendNewsletterSubscriptionEmail(normalizedEmail);

    return NextResponse.json(
      { 
        success: true, 
        message: 'Successfully subscribed to newsletter' 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again later.' },
      { status: 500 }
    );
  }
}

// Optional: Unsubscribe endpoint
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const reason = searchParams.get('reason');

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find subscription
    const subscription = await prisma.newsletterSubscription.findUnique({
      where: { email: normalizedEmail },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: 'Email not found in our newsletter list' },
        { status: 404 }
      );
    }

    if (!subscription.isActive) {
      return NextResponse.json(
        { error: 'Email is already unsubscribed' },
        { status: 400 }
      );
    }

    // Unsubscribe
    await prisma.newsletterSubscription.update({
      where: { email: normalizedEmail },
      data: {
        isActive: false,
        unsubscribedAt: new Date(),
        unsubscribeReason: reason || null,
      },
    });

    return NextResponse.json(
      { success: true, message: 'Successfully unsubscribed from newsletter' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe. Please try again later.' },
      { status: 500 }
    );
  }
}