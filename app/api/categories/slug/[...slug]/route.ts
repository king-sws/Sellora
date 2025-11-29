// app/api/categories/slug/[...slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/prisma';

// Helper function to get all descendant category IDs
async function getAllDescendantCategoryIds(categoryId: string): Promise<string[]> {
  const categoryIds = [categoryId];
  
  const children = await prisma.category.findMany({
    where: {
      parentId: categoryId,
      deletedAt: null
    },
    select: { id: true }
  });
  
  for (const child of children) {
    const descendantIds = await getAllDescendantCategoryIds(child.id);
    categoryIds.push(...descendantIds);
  }
  
  return categoryIds;
}

// Helper to find category by hierarchical path
async function findCategoryByPath(slugArray: string[]) {
  // First, try to find by exact full slug
  const fullSlug = slugArray.join('/');
  const category = await prisma.category.findUnique({
    where: { slug: fullSlug, deletedAt: null }
  });
  
  if (category) return category;
  
  // If not found, try to navigate the hierarchy
  let currentCategory = null;
  
  for (let i = 0; i < slugArray.length; i++) {
    const slug = slugArray[i];
    
    if (i === 0) {
      // Find top-level category
      currentCategory = await prisma.category.findFirst({
        where: {
          slug: slug,
          parentId: null,
          deletedAt: null
        }
      });
    } else {
      // Find child category
      if (!currentCategory) return null;
      
      currentCategory = await prisma.category.findFirst({
        where: {
          slug: slug,
          parentId: currentCategory.id,
          deletedAt: null
        }
      });
    }
    
    if (!currentCategory) return null;
  }
  
  return currentCategory;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug: slugArray } = await params;
    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const skip = (page - 1) * limit;
    
    // Sorting
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    
    // Filters
    const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
    const brands = searchParams.get('brands')?.split(',').filter(Boolean) || [];
    const inStockOnly = searchParams.get('inStockOnly') === 'true';
    const onSaleOnly = searchParams.get('onSaleOnly') === 'true';
    const featuredOnly = searchParams.get('featuredOnly') === 'true';
    const minRating = searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : undefined;

    // Find category using the helper function
    const foundCategory = await findCategoryByPath(slugArray);
    
    if (!foundCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Get full category data with relations
    const category = await prisma.category.findUnique({
      where: { id: foundCategory.id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
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
          },
          orderBy: {
            name: 'asc'
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

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Get all descendant category IDs (including current category)
    const categoryIds = await getAllDescendantCategoryIds(category.id);

    // Build dynamic where clause for products
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      categoryId: { in: categoryIds },
      isActive: true,
      deletedAt: null
    };

    // Price filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    // Brand filter
    if (brands.length > 0) {
      where.brand = {
        name: { in: brands }
      };
    }

    // Stock filter
    if (inStockOnly) {
      where.stock = { gt: 0 };
    }

    // On sale filter
    if (onSaleOnly) {
      where.comparePrice = { not: null, gt: where.price || 0 };
    }

    // Featured filter
    if (featuredOnly) {
      where.isFeatured = true;
    }

    // Build orderBy
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orderBy: any = {};
    switch (sortBy) {
      case 'price':
        orderBy = { price: sortOrder as 'asc' | 'desc' };
        break;
      case 'salesCount':
        orderBy = { salesCount: sortOrder as 'asc' | 'desc' };
        break;
      case 'createdAt':
        orderBy = { createdAt: sortOrder as 'asc' | 'desc' };
        break;
      case 'viewCount':
        orderBy = { viewCount: sortOrder as 'asc' | 'desc' };
        break;
      default:
        orderBy = { name: sortOrder as 'asc' | 'desc' };
    }

    // Fetch products and count
    const [products, totalProducts] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: { name: true, slug: true }
          },
          brand: {
            select: { name: true, slug: true }
          },
          reviews: {
            select: {
              rating: true,
              isVerified: true
            }
          },
          _count: {
            select: {
              reviews: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.product.count({ where })
    ]);

    // Calculate ratings and filter by minRating if specified
    let productsWithRatings = products.map(product => {
      const allReviews = product.reviews;
      const averageRating = allReviews.length > 0
        ? allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length
        : 0;
      
      const verifiedCount = allReviews.filter(r => r.isVerified).length;
      const { reviews, ...productData } = product;
      
      return {
        ...productData,
        rating: parseFloat(averageRating.toFixed(1)),
        reviewCount: product._count.reviews,
        verifiedReviewCount: verifiedCount
      };
    });

    // Apply rating filter in memory
    if (minRating !== undefined && minRating > 0) {
      productsWithRatings = productsWithRatings.filter(p => p.rating >= minRating);
    }

    // Get available brands from ALL descendant categories
    const availableBrands = await prisma.product.groupBy({
      by: ['brandId'],
      where: {
        categoryId: { in: categoryIds },
        isActive: true,
        deletedAt: null,
        brandId: { not: null }
      },
      _count: {
        brandId: true
      }
    });

    const brandsWithNames = await Promise.all(
      availableBrands.map(async (item) => {
        if (!item.brandId) return null;
        const brand = await prisma.brand.findUnique({
          where: { id: item.brandId },
          select: { name: true }
        });
        return brand ? {
          name: brand.name,
          count: item._count.brandId
        } : null;
      })
    );

    const filteredBrands = brandsWithNames.filter(Boolean) as Array<{ name: string; count: number }>;

    // Get price range from ALL descendant categories
    const priceAggregation = await prisma.product.aggregate({
      where: {
        categoryId: { in: categoryIds },
        isActive: true,
        deletedAt: null
      },
      _min: { price: true },
      _max: { price: true }
    });

    return NextResponse.json({
      category,
      products: productsWithRatings,
      pagination: {
        page,
        limit,
        total: totalProducts,
        pages: Math.ceil(totalProducts / limit)
      },
      filters: {
        availableBrands: filteredBrands,
        priceRange: {
          min: priceAggregation._min.price || 0,
          max: priceAggregation._max.price || 5000
        }
      }
    });

  } catch (error) {
    console.error('Error fetching category by slug:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category' },
      { status: 500 }
    );
  }
}