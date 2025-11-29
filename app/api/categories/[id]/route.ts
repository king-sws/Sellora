// app/api/categories/[id]/route.ts
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
  
  // Extract base slug from parent's full slug (last part)
  const parentBaseSlug = parent.slug.split('/').pop() || parent.slug;
  
  // If parent has no parent, just use its slug
  if (!parent.parentId) {
    return `${parent.slug}/${baseSlug}`;
  }
  
  // Otherwise use parent's full slug
  return `${parent.slug}/${baseSlug}`;
}

// Helper to update child category slugs recursively
async function updateChildSlugs(categoryId: string, newParentSlug: string) {
  const children = await prisma.category.findMany({
    where: { parentId: categoryId },
    select: { id: true, name: true, slug: true }
  });

  for (const child of children) {
    // Get the base slug (last part of current slug)
    const baseSlug = child.slug.split('/').pop() || child.slug;
    const newSlug = `${newParentSlug}/${baseSlug}`;
    
    await prisma.category.update({
      where: { id: child.id },
      data: { slug: newSlug }
    });

    // Recursively update this child's children
    await updateChildSlugs(child.id, newSlug);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const includeProducts = searchParams.get('includeProducts') === 'true';

    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        children: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
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
      }
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category' },
      { status: 500 }
    );
  }
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

    const body = await request.json();
    const { name, description, image, parentId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id: params.id }
    });

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Validate parent category if provided
    if (parentId !== undefined && parentId !== null) {
      // Check if trying to set itself as parent
      if (parentId === params.id) {
        return NextResponse.json(
          { error: 'Category cannot be its own parent' },
          { status: 400 }
        );
      }

      const parentCategory = await prisma.category.findUnique({
        where: { id: parentId, deletedAt: null }
      });

      if (!parentCategory) {
        return NextResponse.json(
          { error: 'Parent category not found' },
          { status: 400 }
        );
      }

      // Check for circular reference (parent cannot be a child of current category)
      let currentParent = parentCategory;
      while (currentParent.parentId) {
        if (currentParent.parentId === params.id) {
          return NextResponse.json(
            { error: 'Circular reference detected: parent category cannot be a child of this category' },
            { status: 400 }
          );
        }
        const nextParent = await prisma.category.findUnique({
          where: { id: currentParent.parentId }
        });
        if (!nextParent) break;
        currentParent = nextParent;
      }
    }

    // Check if name conflicts with another category in same parent
    const nameConflict = await prisma.category.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive'
        },
        id: { not: params.id },
        parentId: parentId || null,
        deletedAt: null
      }
    });

    if (nameConflict) {
      return NextResponse.json(
        { error: 'Category with this name already exists in this parent category' },
        { status: 400 }
      );
    }

    // Generate new slug if name or parent changed
    let slug = existingCategory.slug;
    const nameChanged = existingCategory.name !== name.trim();
    const parentChanged = parentId !== undefined && existingCategory.parentId !== parentId;

    if (nameChanged || parentChanged) {
      const baseSlug = generateSlug(name);
      const targetParentId = parentId !== undefined ? parentId : existingCategory.parentId;
      
      // Build full hierarchical slug
      const fullSlug = targetParentId ? await buildFullSlug(targetParentId, baseSlug) : baseSlug;
      
      slug = fullSlug;
      let counter = 1;

      // Ensure slug uniqueness (excluding current category)
      while (await prisma.category.findFirst({ 
        where: { 
          slug,
          id: { not: params.id }
        } 
      })) {
        const slugParts = fullSlug.split('/');
        const lastPart = slugParts[slugParts.length - 1];
        slugParts[slugParts.length - 1] = `${generateSlug(name)}-${counter}`;
        slug = slugParts.join('/');
        counter++;
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        image: image?.trim() || null,
        ...(parentId !== undefined && { parentId: parentId || null }),
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

    // Update child category slugs if this category's slug changed
    if (slug !== existingCategory.slug) {
      await updateChildSlugs(params.id, slug);
    }

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const hard = searchParams.get('hard') === 'true';

    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
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

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Prevent deletion if has active children
    if (category._count.children > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete category with subcategories. Please delete or move subcategories first.',
          childCount: category._count.children
        },
        { status: 400 }
      );
    }

    // If category has products, only allow soft delete
    if (category._count.products > 0 && hard) {
      return NextResponse.json(
        { 
          error: 'Cannot permanently delete category with products. Use soft delete instead.',
          productCount: category._count.products
        },
        { status: 400 }
      );
    }

    if (hard) {
      await prisma.category.delete({
        where: { id: params.id }
      });

      return NextResponse.json({ 
        message: 'Category permanently deleted',
        deleted: true,
        hard: true
      });
    } else {
      const deletedCategory = await prisma.category.update({
        where: { id: params.id },
        data: { 
          deletedAt: new Date(),
          updatedAt: new Date()
        },
        include: {
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
      });

      return NextResponse.json({ 
        message: 'Category soft deleted',
        category: deletedCategory,
        deleted: true,
        hard: false
      });
    }
  } catch (error) {
    console.error('Error deleting category:', error);
    
    if (error instanceof Error && error.message.includes('foreign key constraint')) {
      return NextResponse.json(
        { error: 'Cannot delete category: it has associated products' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}