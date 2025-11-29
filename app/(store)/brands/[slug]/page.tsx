/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(store)/brands/[slug]/page.tsx
import { Suspense } from 'react'
import { prisma } from '@/db/prisma'
import { ProductCard } from '@/components/store/product-card'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Building2, Package, Globe, ArrowLeft, 
  ExternalLink, Sparkles, TrendingUp 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { BrandSortSelect } from '@/components/store/brand-sort-select'

interface BrandProductsPageProps {
  params: {
    slug: string
  }
  searchParams: {
    page?: string
    sort?: string
  }
}

export default async function BrandProductsPage({ 
  params, 
  searchParams 
}: BrandProductsPageProps) {
  const page = parseInt(searchParams.page || '1')
  const limit = 12
  const skip = (page - 1) * limit

  // Fetch brand
  const brand = await prisma.brand.findUnique({
    where: { slug: params.slug },
    include: {
      _count: {
        select: { products: true }
      }
    }
  })

  if (!brand) {
    notFound()
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
    case 'popular':
      orderBy = [{ isFeatured: 'desc' }, { createdAt: 'desc' }]
      break
  }

  // Fetch products
  const [products, featuredProducts, totalProducts] = await Promise.all([
    prisma.product.findMany({
      where: {
        brandId: brand.id,
        isActive: true,
        deletedAt: null
      },
      include: {
        category: true,
        brand: true,
        _count: { select: { reviews: true } }
      },
      orderBy,
      skip,
      take: limit
    }),
    prisma.product.findMany({
      where: {
        brandId: brand.id,
        isActive: true,
        deletedAt: null,
        isFeatured: true
      },
      include: {
        category: true,
        brand: true
      },
      take: 4
    }),
    prisma.product.count({
      where: {
        brandId: brand.id,
        isActive: true,
        deletedAt: null
      }
    })
  ])

  const totalPages = Math.ceil(totalProducts / limit)
  const inStockCount = products.filter(p => p.stock > 0).length

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Brand Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start justify-between gap-6">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link href="/brands">
                <ArrowLeft className="w-4 h-4 mr-2" />
                All Brands
              </Link>
            </Button>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Brand Logo */}
            <div className="w-32 h-32 bg-slate-50 rounded-2xl border-2 border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-lg">
              {brand.logo ? (
                <Image
                  src={brand.logo}
                  alt={brand.name}
                  width={128}
                  height={128}
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <Building2 className="w-16 h-16 text-slate-400" />
              )}
            </div>

            {/* Brand Info */}
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
                {brand.name}
              </h1>
              
              {brand.description && (
                <p className="text-slate-600 mb-4 max-w-3xl">
                  {brand.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="text-sm gap-1">
                  <Package className="w-4 h-4" />
                  {totalProducts} products
                </Badge>
                
                <Badge variant="outline" className="text-sm gap-1 text-green-700 border-green-300 bg-green-50">
                  <TrendingUp className="w-4 h-4" />
                  {inStockCount} in stock
                </Badge>

                {brand.website && (
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href={brand.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Visit Website
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-6 h-6 text-yellow-500" />
              <h2 className="text-2xl font-bold text-slate-900">
                Featured Products
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}

        {/* All Products */}
        <div>
          <div className="flex items-center justify-between mb-6">
  <h2 className="text-2xl font-bold text-slate-900">
    All Products
  </h2>
  
  <BrandSortSelect currentSort={searchParams.sort} />
</div>

          {products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-2">
                  {page > 1 && (
                    <Button variant="outline" asChild>
                      <Link href={`?page=${page - 1}${searchParams.sort ? `&sort=${searchParams.sort}` : ''}`}>
                        Previous
                      </Link>
                    </Button>
                  )}
                  
                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (page <= 3) {
                        pageNum = i + 1
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = page - 2 + i
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? 'default' : 'outline'}
                          size="sm"
                          asChild
                        >
                          <Link href={`?page=${pageNum}${searchParams.sort ? `&sort=${searchParams.sort}` : ''}`}>
                            {pageNum}
                          </Link>
                        </Button>
                      )
                    })}
                  </div>
                  
                  {page < totalPages && (
                    <Button variant="outline" asChild>
                      <Link href={`?page=${page + 1}${searchParams.sort ? `&sort=${searchParams.sort}` : ''}`}>
                        Next
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : (
            <Card className="border-2 border-dashed">
              <CardContent className="py-16 text-center">
                <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  No products available
                </h3>
                <p className="text-slate-600 mb-6">
                  This brand doesn't have any products yet.
                </p>
                <Button asChild>
                  <Link href="/products">
                    Browse All Products
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}