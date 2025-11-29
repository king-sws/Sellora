// app/api/profile/image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import sharp from 'sharp';

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const AVATAR_SIZE = 400; // Resize all avatars to 400x400
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'avatars');

// Helper: Generate unique filename
function generateFileName(email: string): string {
  const timestamp = Date.now();
  const hash = Buffer.from(email).toString('base64').slice(0, 8);
  return `avatar-${hash}-${timestamp}.webp`;
}

// Helper: Delete old image file
async function deleteOldImage(imageUrl: string | null): Promise<void> {
  if (!imageUrl || !imageUrl.startsWith('/uploads/avatars/')) return;
  
  try {
    const oldFilePath = join(process.cwd(), 'public', imageUrl);
    if (existsSync(oldFilePath)) {
      await unlink(oldFilePath);
      console.log('Deleted old image:', oldFilePath);
    }
  } catch (error) {
    console.error('Failed to delete old image:', error);
    // Non-critical error, continue
  }
}

// Helper: Optimize and save image
async function optimizeAndSaveImage(
  buffer: Buffer,
  fileName: string
): Promise<void> {
  // Ensure directory exists
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }

  const filePath = join(UPLOAD_DIR, fileName);

  // Optimize image: resize, convert to WebP, and compress
  await sharp(buffer)
    .resize(AVATAR_SIZE, AVATAR_SIZE, {
      fit: 'cover',
      position: 'center',
    })
    .webp({ quality: 85 })
    .toFile(filePath);
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // 3. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Image must be less than 5MB' },
        { status: 400 }
      );
    }

    // 4. Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, and WebP images are allowed' },
        { status: 400 }
      );
    }

    // 5. Get current user to check for old image
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { image: true },
    });

    // 6. Process image
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = generateFileName(session.user.email);
    const imageUrl = `/uploads/avatars/${fileName}`;

    // 7. Optimize and save new image (async operation)
    await optimizeAndSaveImage(buffer, fileName);

    // 8. Update database
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { image: imageUrl },
      select: { email: true, image: true, name: true },
    });

    // 9. Delete old image after successful upload (non-blocking)
    if (currentUser?.image) {
      deleteOldImage(currentUser.image).catch(console.error);
    }

    // 10. Return success with cache headers
    return NextResponse.json(
      {
        success: true,
        message: 'Image uploaded successfully',
        imageUrl,
        user: {
          email: updatedUser.email,
          name: updatedUser.name,
          image: updatedUser.image,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache',
        },
      }
    );
  } catch (error) {
    console.error('Error uploading image:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      // Sharp-specific errors
      if (error.message.includes('Input buffer')) {
        return NextResponse.json(
          { error: 'Invalid or corrupted image file' },
          { status: 400 }
        );
      }
      
      // Database errors
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'Database conflict' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

// Optional: Add GET endpoint to retrieve current profile image
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { image: true },
    });

    return NextResponse.json({
      imageUrl: user?.image || null,
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 }
    );
  }
}

// Optional: Add DELETE endpoint to remove profile image
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { image: true },
    });

    // Delete from database
    await prisma.user.update({
      where: { email: session.user.email },
      data: { image: null },
    });

    // Delete file
    if (user?.image) {
      await deleteOldImage(user.image);
    }

    return NextResponse.json({
      success: true,
      message: 'Profile image removed',
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}