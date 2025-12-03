/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(store)/products/page.tsx
import { Suspense } from 'react'
import { prisma } from '@/db/prisma'
import { ProductCard } from '@/components/store/product-card'
import { ProductFilters } from '@/components/store/product-filters'
import { Pagination } from '@/components/store/pagination'
import { Badge } from '@/components/ui/badge'
import { 
  Grid3x3, 
  LayoutGrid, 
  List, 
  Filter,
  SlidersHorizontal,
  Sparkles,
  Package
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'

interface ProductsPageProps {
  searchParams: {
    page?: string
    category?: string
    search?: string
    sort?: string
    min_price?: string
    max_price?: string
    view?: string
    featured?: string
    in_stock?: string
  }
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const page = parseInt(searchParams.page || '1')
  const viewMode = searchParams.view || 'grid'
  const limit = viewMode === 'list' ? 20 : 12
  const skip = (page - 1) * limit

  // Build where clause
  const where: any = {
    isActive: true,
    deletedAt: null,
  }

  // Only show in-stock products if filter is enabled
  if (searchParams.in_stock === 'true') {
    where.stock = { gt: 0 }
  }

  // Featured filter
  if (searchParams.featured === 'true') {
    where.isFeatured = true
  }

  if (searchParams.category) {
    where.category = { slug: searchParams.category }
  }

  if (searchParams.search) {
    where.OR = [
      { name: { contains: searchParams.search, mode: 'insensitive' } },
      { description: { contains: searchParams.search, mode: 'insensitive' } },
      { sku: { contains: searchParams.search, mode: 'insensitive' } }
    ]
  }

  if (searchParams.min_price || searchParams.max_price) {
    where.price = {}
    if (searchParams.min_price) {
      where.price.gte = parseFloat(searchParams.min_price)
    }
    if (searchParams.max_price) {
      where.price.lte = parseFloat(searchParams.max_price)
    }
  }

  // Build orderBy
  let orderBy: any = { createdAt: 'desc' }
  switch (searchParams.sort) {
    case 'price_asc':
      orderBy = { price: 'asc' }
      break
    case 'price_desc':
      orderBy = { price: 'desc' }
      break
    case 'name_asc':
      orderBy = { name: 'asc' }
      break
    case 'name_desc':
      orderBy = { name: 'desc' }
      break
    case 'popular':
      // You can add a popularity score or order by review count
      orderBy = [{ isFeatured: 'desc' }, { createdAt: 'desc' }]
      break
    case 'newest':
      orderBy = { createdAt: 'desc' }
      break
  }

  const [products, total, categories, featuredCount, inStockCount] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        _count: { select: { reviews: true } }
      },
      orderBy,
      skip,
      take: limit
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { products: true } }
      },
      orderBy: { name: 'asc' }
    }),
    prisma.product.count({ 
      where: { ...where, isFeatured: true } 
    }),
    prisma.product.count({ 
      where: { ...where, stock: { gt: 0 } } 
    })
  ])

  const totalPages = Math.ceil(total / limit)

  // Active filters count
  const activeFiltersCount = [
    searchParams.category,
    searchParams.min_price,
    searchParams.max_price,
    searchParams.featured,
    searchParams.in_stock
  ].filter(Boolean).length

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                {searchParams.search ? (
                  <>
                    Search Results
                    <Badge variant="secondary" className="text-base">
                      "{searchParams.search}"
                    </Badge>
                  </>
                ) : searchParams.featured === 'true' ? (
                  <>
                    <Sparkles className="w-8 h-8 text-yellow-500" />
                    Featured Products
                  </>
                ) : (
                  'All Products'
                )}
              </h1>
              
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-gray-600">
                  {total.toLocaleString()} product{total !== 1 ? 's' : ''} found
                </p>
                
                {/* Quick Stats */}
                <div className="flex items-center gap-2">
                  {featuredCount > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Sparkles className="w-3 h-3" />
                      {featuredCount} Featured
                    </Badge>
                  )}
                  {inStockCount > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Package className="w-3 h-3" />
                      {inStockCount} In Stock
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* View Mode Toggle - Desktop */}
            <div className="hidden lg:flex items-center gap-2">
              <ViewModeToggle currentView={viewMode} />
            </div>
          </div>

          {/* Active Filters Bar */}
          {activeFiltersCount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} applied
                  </span>
                  
                  {/* Active filter badges */}
                  <div className="flex gap-2 flex-wrap">
                    {searchParams.category && (
                      <Badge variant="secondary">
                        Category: {categories.find(c => c.slug === searchParams.category)?.name}
                      </Badge>
                    )}
                    {searchParams.featured === 'true' && (
                      <Badge variant="secondary">Featured Only</Badge>
                    )}
                    {searchParams.in_stock === 'true' && (
                      <Badge variant="secondary">In Stock</Badge>
                    )}
                    {(searchParams.min_price || searchParams.max_price) && (
                      <Badge variant="secondary">
                        Price: {searchParams.min_price || '0'} - {searchParams.max_price || '∞'}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                >
                  <Link href="/products" className="text-blue-600 hover:text-blue-700">
                    Clear all
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <SlidersHorizontal className="w-5 h-5 text-gray-700" />
                  <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                </div>
                
                <ProductFilters
                  categories={categories}
                  currentCategory={searchParams.category}
                  currentSort={searchParams.sort}
                  currentMinPrice={searchParams.min_price}
                  currentMaxPrice={searchParams.max_price}
                  featuredCount={featuredCount}
                  inStockCount={inStockCount}
                />
              </div>
            </div>
          </aside>

          {/* Products Grid/List */}
          <div className="lg:col-span-3 mt-8 lg:mt-0">
            {/* Mobile View Toggle & Sort */}
            <div className="lg:hidden mb-6 flex gap-2">
              <ViewModeToggle currentView={viewMode} />
            </div>

            <Suspense fallback={<ProductsLoading viewMode={viewMode} />}>
              {products.length > 0 ? (
                <>
                  {/* Products Grid */}
                  {viewMode === 'grid' && (
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                      {products.map((product) => (
                        <ProductCard 
                          key={product.id} 
                          product={product}
                        />
                      ))}
                    </div>
                  )}

                  {/* Compact Grid (4 columns) */}
                  {viewMode === 'compact' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                      {products.map((product) => (
                        <ProductCard 
                          key={product.id} 
                          product={product}
                        />
                      ))}
                    </div>
                  )}

                  {/* List View */}
                  {viewMode === 'list' && (
                    <div className="space-y-4 mb-8">
                      {products.map((product) => (
                        <ProductCard 
                          key={product.id} 
                          product={product}
                        />
                      ))}
                    </div>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-12">
                      <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        searchParams={searchParams}
                      />
                    </div>
                  )}
                </>
              ) : (
                <EmptyState searchParams={searchParams} />
              )}
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}

// View Mode Toggle Component
function ViewModeToggle({ currentView }: { currentView: string }) {
  return (
    <Tabs value={currentView} className="w-auto">
      <TabsList className="grid grid-cols-3 w-auto">
        <TabsTrigger value="grid" asChild>
          <a href="?view=grid" className="cursor-pointer">
            <LayoutGrid className="w-4 h-4" />
          </a>
        </TabsTrigger>
        <TabsTrigger value="compact" asChild>
          <a href="?view=compact" className="cursor-pointer">
            <Grid3x3 className="w-4 h-4" />
          </a>
        </TabsTrigger>
        <TabsTrigger value="list" asChild>
          <a href="?view=list" className="cursor-pointer">
            <List className="w-4 h-4" />
          </a>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

// Loading Skeleton
function ProductsLoading({ viewMode = 'grid' }: { viewMode?: string }) {
  const count = viewMode === 'list' ? 8 : viewMode === 'compact' ? 8 : 6
  
  return (
    <div className={
      viewMode === 'list' 
        ? 'space-y-4'
        : viewMode === 'compact'
        ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'
        : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
    }>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
          <div className={viewMode === 'list' ? 'flex gap-4 p-4' : ''}>
            <div className={
              viewMode === 'list' 
                ? 'w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0' 
                : 'aspect-square bg-gray-200'
            } />
            <div className="p-4 space-y-3 flex-1">
              <div className="h-3 bg-gray-200 rounded w-1/4" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Empty State
function EmptyState({ searchParams }: { searchParams: any }) {
  const hasFilters = searchParams.category || searchParams.search || 
                     searchParams.min_price || searchParams.max_price

  return (
    <div className="text-center py-16 px-4">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
        <Package className="w-10 h-10 text-gray-400" />
      </div>
      
      <h3 className="text-2xl font-semibold text-gray-900 mb-2">
        {hasFilters ? 'No products match your filters' : 'No products found'}
      </h3>
      
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        {hasFilters 
          ? 'Try adjusting your search or filter criteria to find what you\'re looking for.'
          : 'Check back soon for new products!'
        }
      </p>
      
      {hasFilters && (
        <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-blue-700">
          <Link href="/products">
            Clear all filters
          </Link>
        </Button>
      )}
    </div>
  )
}