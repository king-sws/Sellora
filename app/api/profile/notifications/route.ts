// app/api/profile/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { z } from 'zod';

const NotificationSchema = z.object({
  orderUpdates: z.boolean().optional(),
  promotions: z.boolean().optional(),
  newsletter: z.boolean().optional(),
  productRecommendations: z.boolean().optional(),
});

// Note: You'll need to add a NotificationSettings model to your Prisma schema
// Or store this as JSON in the User model

// GET /api/profile/notifications
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // For now, we'll store this in a separate table or as JSON
    // You can add a notificationSettings Json field to User model
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        // notificationSettings: true, // Add this to your User model as Json type
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Default settings if none exist
    const defaultSettings = {
      orderUpdates: true,
      promotions: false,
      newsletter: false,
      productRecommendations: false,
    };

    // Return stored settings or defaults
    // const settings = user.notificationSettings || defaultSettings;
    
    return NextResponse.json(defaultSettings);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// PATCH /api/profile/notifications
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = NotificationSchema.parse(body);

    // Get current settings
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        // notificationSettings: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Merge with existing settings
    // const currentSettings = user.notificationSettings || {};
    // const updatedSettings = { ...currentSettings, ...validatedData };

    // Update user
    // await prisma.user.update({
    //   where: { email: session.user.email },
    //   data: {
    //     notificationSettings: updatedSettings,
    //   },
    // });

    return NextResponse.json({
      message: 'Notification preferences updated',
      // settings: updatedSettings,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error'},
        { status: 400 }
      );
    }

    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}