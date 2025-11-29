// app/api/categories/route.ts
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

// Helper to build full hierarchical slug
async function buildFullSlug(categoryId: string | null, baseSlug: string): Promise<string> {
  if (!categoryId) return baseSlug;
  
  const parent = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { slug: true, parentId: true }
  });
  
  if (!parent) return baseSlug;
  
  // Recursively build parent slugs
  if (parent.parentId) {
    const parentSlug = await buildFullSlug(parent.parentId, parent.slug);
    return `${parentSlug}/${baseSlug}`;
  }
  
  return `${parent.slug}/${baseSlug}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeProducts = searchParams.get('includeProducts') === 'true';
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const includeChildren = searchParams.get('includeChildren') === 'true';
    const onlyParents = searchParams.get('onlyParents') === 'true';
    const search = searchParams.get('search');
    const parentId = searchParams.get('parentId');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    if (parentId) {
      where.parentId = parentId === 'null' ? null : parentId;
    } else if (onlyParents) {
      where.parentId = null;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        ...(includeChildren && {
          children: {
            where: {
              deletedAt: null
            },
            select: {
              id: true,
              name: true,
              slug: true,
              image: true,
              _count: {
                select: {
                  products: {
                    where: {
                      isActive: true,
                      deletedAt: null
                    }
                  }
                }
              }
            }
          }
        }),
        ...(includeProducts && {
          products: {
            where: {
              isActive: true,
              deletedAt: null
            },
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              images: true
            }
          }
        }),
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
      },
      orderBy: [
        { name: 'asc' }
      ]
    });

    return NextResponse.json(categories);

  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, image, parentId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Validate parent category exists if provided
    if (parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: parentId, deletedAt: null }
      });

      if (!parentCategory) {
        return NextResponse.json(
          { error: 'Parent category not found' },
          { status: 400 }
        );
      }
    }

    // Generate base slug from name
    const baseSlug = generateSlug(name);
    
    // Build full hierarchical slug
    const fullSlug = parentId ? await buildFullSlug(parentId, baseSlug) : baseSlug;
    
    // Ensure slug uniqueness
    let slug = fullSlug;
    let counter = 1;

    while (await prisma.category.findUnique({ where: { slug } })) {
      const slugParts = fullSlug.split('/');
      const lastPart = slugParts[slugParts.length - 1];
      slugParts[slugParts.length - 1] = `${lastPart}-${counter}`;
      slug = slugParts.join('/');
      counter++;
    }

    // Check for duplicate names within same parent
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive'
        },
        parentId: parentId || null,
        deletedAt: null
      }
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this name already exists in this parent category' },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        image: image?.trim() || null,
        parentId: parentId || null
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
            products: true,
            children: true
          }
        }
      }
    });

    return NextResponse.json(category, { status: 201 });

  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}