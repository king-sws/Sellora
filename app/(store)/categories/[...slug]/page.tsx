/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(shop)/categories/[...slug]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Grid, List, SlidersHorizontal, Star, ChevronRight, Package } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { EnhancedWishlistButton } from '@/components/store/wishlist-button';
import { CategoryFilters, FilterState } from '@/components/store/CategoryFilters';
import { getCategoryCustomContent } from '@/lib/category-banners-config';
import { Title } from '@/components/Title';
import { ProductCard } from '@/components/store/ProductCard';


interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  images: string[];
  isFeatured?: boolean;
  salesCount?: number;
  rating: number;
  reviewCount: number;
  category: {
    name: string;
    slug: string;
  };
  brand?: {
    name: string;
    slug: string;
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  parent?: {
    id: string;
    name: string;
    slug: string;
  };
  children: Array<{
    id: string;
    name: string;
    slug: string;
    image: string | null;
    _count: {
      products: number;
    };
  }>;
  _count: {
    products: number;
    children: number;
  };
}

interface CategoryPageData {
  category: Category;
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    availableBrands: Array<{ name: string; count: number }>;
    priceRange: { min: number; max: number };
  };
}

const categoryImages: Record<string, string> = {
  electronics: '/elec.jpg',
  fashion: '/fashion.jpg',
  home: '/homes.jpg',
  sports: '/sport.jpg',
  books: '/book.jpg',
};


function getPositionClasses(position?: string) {
  const positions = {
    'left': 'items-start justify-center text-left left-8 md:left-16',
    'center': 'items-center justify-center text-center',
    'right': 'items-end justify-center text-right right-8 md:right-16',
    'top-left': 'items-start justify-start text-left top-8 left-8 md:top-16 md:left-16',
    'bottom-left': 'items-start justify-end text-left bottom-8 left-8 md:bottom-16 md:left-16',
    'top-right': 'items-end justify-start text-right top-8 right-8 md:top-16 md:right-16',
    'bottom-right': 'items-end justify-end text-right bottom-8 right-8 md:bottom-16 md:right-16',
  };
  return positions[position as keyof typeof positions] || positions.left;
}

const StarRating = ({ rating = 0, reviewCount = 0 }: { rating?: number; reviewCount?: number }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
        ))}
        {hasHalfStar && (
          <div className="relative w-3.5 h-3.5">
            <Star className="w-3.5 h-3.5 fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700" />
            <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            </div>
          </div>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} className="w-3.5 h-3.5 fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700" />
        ))}
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
        ({reviewCount})
      </span>
    </div>
  );
};

const Breadcrumb = ({ slug }: { slug: string[] }) => {
  const parts = slug;
  
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
      <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
        Home
      </Link>
      <ChevronRight className="w-4 h-4" />
      <Link href="/categories" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
        Categories
      </Link>
      {parts.map((part, index) => {
        const href = `/categories/${parts.slice(0, index + 1).join('/')}`;
        const isLast = index === parts.length - 1;
        
        return (
          <div key={part} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4" />
            {isLast ? (
              <span className="text-gray-900 dark:text-white font-medium capitalize">
                {part.replace(/-/g, ' ')}
              </span>
            ) : (
              <Link 
                href={href} 
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors capitalize"
              >
                {part.replace(/-/g, ' ')}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
};

function HeroBannerCarousel({ banners }: { banners: any[] }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  useEffect(() => {
    if (banners.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);
    
    return () => clearInterval(timer);
  }, [banners.length]);
  
  if (banners.length === 0) return null;
  
  return (
    <div className="relative w-full aspect-[2048/538] rounded-2xl overflow-hidden group bg-[#f8f8f8]">
      {banners.map((banner, index) => (
        <Link
          key={banner.id}
          href={banner.link || '#'}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          <Image
            src={banner.image}
            alt={banner.alt}
            fill
            className="object-cover object-center"
            priority={index === 0}
          />
        </Link>
      ))}

      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.preventDefault();
                setCurrentSlide(index);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlide
                  ? 'bg-white w-8'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PromoCardsGrid({ cards }: { cards: any[] }) {
  if (cards.length === 0) return null;
  
  return (
    <section className="py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={card.link || '#'}
            className="group relative rounded-2xl sm:rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="relative w-full h-64 sm:h-72 lg:h-80">
              <Image
                src={card.image}
                alt={card.alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FeaturedBanner({ banner }: { banner: any }) {
  return (
    <Link
      href={banner.link || '#'}
      className="block relative w-full h-[200px] sm:h-[250px] lg:h-[300px] rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.01]"
    >
      <Image
        src={banner.image}
        alt={banner.alt}
        fill
        className="object-cover"
      />
    </Link>
  );
}

function BottomBanners({ banners }: { banners: any[] }) {
  if (banners.length === 0) return null;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-8">
      {banners.map((banner) => (
        <div
          key={banner.id}
          className="relative w-full h-32 sm:h-75 rounded-xl overflow-hidden"
        >
          <Image
            src={banner.image}
            alt={banner.alt}
            fill
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}

export default function HierarchicalCategoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  
  const slugArray: string[] = Array.isArray(params.slug)
    ? params.slug.filter((s): s is string => typeof s === 'string' && s.length > 0)
    : params.slug
    ? [params.slug]
    : [];
  const fullSlug = slugArray.join('/');
  
  const customContent = getCategoryCustomContent(fullSlug);
  
  const [data, setData] = useState<CategoryPageData | null>(null);
  const [loading, setLoading] = useState(true);
  // Changed default to 'grid' (keeping it as is)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'featured');
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    priceRange: [0, 5000],
    brands: [],
    inStockOnly: false,
    onSaleOnly: false,
    featuredOnly: false,
    minRating: 0
  });

  useEffect(() => {
    fetchCategoryData();
  }, [fullSlug, currentPage, sortBy, appliedFilters]);

  const fetchCategoryData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        sortBy: sortBy === 'featured' ? 'name' : sortBy,
        sortOrder: sortBy === 'price-low' ? 'asc' : sortBy === 'price-high' ? 'desc' : 'asc',
      });

      if (appliedFilters.priceRange[0] > 0) {
        queryParams.append('minPrice', appliedFilters.priceRange[0].toString());
      }
      if (appliedFilters.priceRange[1] < 5000) {
        queryParams.append('maxPrice', appliedFilters.priceRange[1].toString());
      }
      if (appliedFilters.brands.length > 0) {
        queryParams.append('brands', appliedFilters.brands.join(','));
      }
      if (appliedFilters.inStockOnly) {
        queryParams.append('inStockOnly', 'true');
      }
      if (appliedFilters.onSaleOnly) {
        queryParams.append('onSaleOnly', 'true');
      }
      if (appliedFilters.featuredOnly) {
        queryParams.append('featuredOnly', 'true');
      }
      if (appliedFilters.minRating > 0) {
        queryParams.append('minRating', appliedFilters.minRating.toString());
      }

      const response = await fetch(`/api/categories/slug/${fullSlug}?${queryParams}`);
      
      if (response.ok) {
        const categoryData = await response.json();
        setData(categoryData);
      } else {
        console.error('Category not found');
      }
    } catch (error) {
      console.error('Error fetching category data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = (newFilters: FilterState) => {
    setAppliedFilters(newFilters);
    setCurrentPage(1);
  };

  const addToCart = async (productId: string) => {
    if (!session) {
      window.location.href = '/auth/sign-in';
      return;
    }

    try {
      setAddingToCart(productId);
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          quantity: 1,
        }),
      });

      if (response.ok) {
        console.log('Added to cart successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add to cart');
    } finally {
      setAddingToCart(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 py-8">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Category Not Found</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">The category you&apos;re looking for doesn&apos;t exist.</p>
            <Link href="/categories">
              <Button>Browse All Categories</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { category, products, pagination, filters } = data;
  const baseSlug = slugArray[0] ?? '';
  const heroImage = category.image || categoryImages[baseSlug] || '/images/categories/default-hero.jpg';

  const startIndex = ((pagination.page - 1) * pagination.limit) + 1;
  const endIndex = Math.min(pagination.page * pagination.limit, pagination.total);

const subcategories = category.children.map(child => ({
  title: child.name,
  href: `/categories/${fullSlug}/${child.slug}`,
  count: child._count.products
}));

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <Breadcrumb slug={slugArray} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {customContent?.heroBanners && customContent.heroBanners.length > 0 ? (
          <div className="py-6">
            <HeroBannerCarousel banners={customContent.heroBanners} />
          </div>
        ) : (
          <div className="py-6">
            <Card className="relative h-[220px] sm:h-[300px] md:h-[380px] overflow-hidden rounded-3xl shadow-xl border-none">
              <Image
                src={heroImage}
                alt={category.name}
                fill
                className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/10" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 text-white">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-2 tracking-tight drop-shadow-xl">
                  {category.name}
                </h1>
                {category.description && (
                  <p className="text-sm sm:text-base md:text-lg text-gray-200 max-w-2xl mb-3 drop-shadow-md leading-relaxed">
                    {category.description}
                  </p>
                )}
                <p className="text-xs sm:text-sm md:text-base text-gray-300 drop-shadow-md">
                  {pagination.total} products available
                </p>
              </div>
            </Card>
          </div>
        )}

        {customContent?.promoCards && customContent.promoCards.length > 0 && (
          <PromoCardsGrid cards={customContent.promoCards} />
        )}

{category.children.length > 0 && !customContent?.promoCards && (
  <div className="py-6">
    <Title>Browse by Subcategory</Title>

    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {category.children.map((child) => {
        // Build proper hierarchical path
        const childHref = child.slug.includes('/')
          ? `/categories/${child.slug}`
          : `/categories/${fullSlug}/${child.slug}`;

        return (
          <Link
            key={child.id}
            href={childHref}
            className="group"
          >
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all">
              <div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                {child.image ? (
                  <Image
                    src={child.image}
                    alt={child.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="p-3">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-1">
                  {child.name}
                </h3>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {child._count.products} items
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  </div>
)}


        {customContent?.featuredSectionBanners && customContent.featuredSectionBanners.length > 0 && (
          <div className="py-6">
            <Title>Featured Deals</Title>
            <FeaturedBanner banner={customContent.featuredSectionBanners[0]} />
          </div>
        )}

        <div className="py-8">
          <div className="flex gap-6">
            <CategoryFilters
              availableBrands={filters.availableBrands}
              filters={appliedFilters}
              onApplyFilters={handleApplyFilters}
              totalProducts={pagination.total}
              isOpen={showMobileFilters}
              onClose={() => setShowMobileFilters(false)}
              subcategories={subcategories}
              categoryName={category.name}
              categorySlug={fullSlug}
            />

            <div className="flex-1 min-w-0">
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm px-4 sm:px-5 py-4 mb-6 border border-gray-100 dark:border-gray-800">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="lg:hidden"
                      onClick={() => setShowMobileFilters(true)}
                    >
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{startIndex}–{endIndex}</span> of{' '}
                      <span className="font-medium text-gray-800 dark:text-gray-200">{pagination.total}</span> products
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="featured">Featured</SelectItem>
                        <SelectItem value="name">Name: A–Z</SelectItem>
                        <SelectItem value="price-low">Price: Low → High</SelectItem>
                        <SelectItem value="price-high">Price: High → Low</SelectItem>
                        <SelectItem value="createdAt">Newest First</SelectItem>
                        <SelectItem value="salesCount">Best Selling</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* View mode toggle - Grid is default/primary */}
                    <div className="hidden sm:flex border rounded-lg overflow-hidden">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="rounded-none"
                        title="Grid view"
                      >
                        <Grid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="rounded-none"
                        title="List view"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {products.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      No products found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Try adjusting your filters or browse all products.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button variant="outline" onClick={() => handleApplyFilters({
                        priceRange: [0, 5000],
                        brands: [],
                        inStockOnly: false,
                        onSaleOnly: false,
                        featuredOnly: false,
                        minRating: 0
                      })}>
                        Clear Filters
                      </Button>
                      <Link href="/products">
                        <Button>Browse All Products</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Always use grid layout as primary display */}
                  <div className={cn(
                    "grid gap-5 mb-8",
                    viewMode === 'grid' 
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                      : 'grid-cols-1'
                  )}>
                    {products.map((product) => (
                      <ProductCard
                        key={product.id} 
                        product={product}
                        viewMode={viewMode}
                      />
                    ))}
                  </div>

                  {pagination.pages > 1 && (
                    <div className="flex justify-center">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={pagination.page === 1}
                        >
                          Previous
                        </Button>
                        
                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                            const page = pagination.page <= 3 
                              ? i + 1 
                              : pagination.page >= pagination.pages - 2
                              ? pagination.pages - 4 + i
                              : pagination.page - 2 + i;
                            
                            if (page < 1 || page > pagination.pages) return null;
                            
                            return (
                              <Button
                                key={page}
                                variant={pagination.page === page ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </Button>
                            );
                          })}
                        </div>

                        <Button
                          variant="outline"
                          onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                          disabled={pagination.page === pagination.pages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {customContent?.bottomBanners && customContent.bottomBanners.length > 0 && (
          <BottomBanners banners={customContent.bottomBanners} />
        )}
      </div>
    </div>
  );
}