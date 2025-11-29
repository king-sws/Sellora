// app/api/categories/[id]/restore/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';
import { auth } from '@/auth';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function buildFullSlug(categoryId: string | null, baseSlug: string): Promise<string> {
  if (!categoryId) return baseSlug;
  
  const parent = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { slug: true, parentId: true }
  });
  
  if (!parent) return baseSlug;
  
  return `${parent.slug}/${baseSlug}`;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        parent: true
      }
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    if (!category.deletedAt) {
      return NextResponse.json({ error: 'Category is not deleted' }, { status: 400 });
    }

    // Check if parent category is active (if has parent)
    if (category.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: category.parentId }
      });

      if (!parent || parent.deletedAt) {
        return NextResponse.json(
          { error: 'Cannot restore: Parent category is deleted or not found. Please restore parent first or remove parent association.' },
          { status: 400 }
        );
      }
    }

    // Check if name conflicts with existing active category in same parent
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: {
          equals: category.name,
          mode: 'insensitive'
        },
        parentId: category.parentId,
        id: { not: params.id },
        deletedAt: null
      }
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Cannot restore: A category with this name already exists in this parent category' },
        { status: 400 }
      );
    }

    // Check if slug conflicts with existing category
    const slugConflict = await prisma.category.findFirst({
      where: {
        slug: category.slug,
        id: { not: params.id },
        deletedAt: null
      }
    });

    let newSlug = category.slug;

    // If slug conflicts, generate new one
    if (slugConflict) {
      const baseSlug = generateSlug(category.name);
      const fullSlug = category.parentId 
        ? await buildFullSlug(category.parentId, baseSlug)
        : baseSlug;
      
      newSlug = fullSlug;
      let counter = 1;

      while (await prisma.category.findFirst({ 
        where: { 
          slug: newSlug,
          id: { not: params.id }
        } 
      })) {
        const slugParts = fullSlug.split('/');
        const lastPart = slugParts[slugParts.length - 1];
        slugParts[slugParts.length - 1] = `${lastPart}-${counter}`;
        newSlug = slugParts.join('/');
        counter++;
      }
    }

    const restoredCategory = await prisma.category.update({
      where: { id: params.id },
      data: { 
        deletedAt: null,
        slug: newSlug,
        updatedAt: new Date()
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        _count: {
          select: {
            products: {
              where: {
                isActive: true,
                deletedAt: null
              }
            },
            children: {
              where: {
                deletedAt: null
              }
            }
          }
        }
      }
    });

    return NextResponse.json(restoredCategory);
   
  } catch (error) {
    console.error('Error restoring category:', error);
    return NextResponse.json(
      { error: 'Failed to restore category' },
      { status: 500 }
    );
  }
}