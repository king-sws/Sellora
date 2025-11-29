/* eslint-disable react/no-unescaped-entities */

// app/(shop)/categories/page.tsx
import { prisma } from '@/db/prisma';
import Link from 'next/link';
import Image from 'next/image';
import { Package, ChevronRight, Grid3x3, Sparkles, TrendingUp, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Shop by Category',
  description: 'Browse products by category'
};

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    where: {
      deletedAt: null,
      products: {
        some: {
          isActive: true,
          deletedAt: null,
          stock: { gt: 0 }
        }
      }
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
      },
      products: {
        where: {
          isActive: true,
          deletedAt: null
        },
        take: 4,
        select: {
          id: true,
          name: true,
          images: true,
          price: true,
          isFeatured: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  const totalProducts = await prisma.product.count({
    where: {
      isActive: true,
      deletedAt: null
    }
  });

  const featuredCategories = categories.slice(0, 3);
  const regularCategories = categories.slice(3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header with Breadcrumb */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <Link href="/" className="hover:text-gray-900">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">Categories</span>
          </div>
          
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Shop by Category
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover our curated collection of {totalProducts.toLocaleString()} premium products across {categories.length} carefully selected categories
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Grid3x3 className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{categories.length}</p>
            <p className="text-sm text-gray-600">Categories</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{totalProducts}</p>
            <p className="text-sm text-gray-600">Products</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-yellow-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">Daily</p>
            <p className="text-sm text-gray-600">New Arrivals</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Star className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">Premium</p>
            <p className="text-sm text-gray-600">Quality</p>
          </div>
        </div>

        {/* Featured Categories - Large Cards */}
        {featuredCategories.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Featured Categories</h2>
                <p className="text-gray-600 mt-1">Explore our most popular collections</p>
              </div>
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredCategories.map((category) => (
                <Link
                  key={category.id}
                  href={`/products?category=${category.slug}`}
                  className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500"
                >
                  <div className="relative h-80 bg-gradient-to-br from-gray-100 to-gray-200">
                    {category.image ? (
                      <Image
                        src={category.image}
                        alt={category.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : category.products[0]?.images[0] ? (
                      <Image
                        src={category.products[0].images[0]}
                        alt={category.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Package className="w-20 h-20 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    
                    {/* Content */}
                    <div className="absolute inset-0 p-6 flex flex-col justify-end">
                      <Badge className="self-start mb-3 bg-white/90 text-gray-900 hover:bg-white">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                      
                      <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                        {category.name}
                      </h3>
                      
                      {category.description && (
                        <p className="text-sm text-gray-200 mb-3 line-clamp-2">
                          {category.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-white/90 text-sm font-medium">
                          {category._count.products} {category._count.products === 1 ? 'item' : 'items'}
                        </span>
                        <span className="text-white font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                          Explore
                          <ChevronRight className="w-5 h-5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All Categories - Grid */}
        {categories.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No categories available
            </h3>
            <p className="text-gray-600 mb-6">Check back soon for new products!</p>
          </div>
        ) : (
          <>
            {regularCategories.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">All Categories</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {regularCategories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/products?category=${category.slug}`}
                      className="group"
                    >
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-blue-300 hover:-translate-y-2">
                        {/* Category Image */}
                        <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                          {category.image ? (
                            <Image
                              src={category.image}
                              alt={category.name}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : category.products[0]?.images[0] ? (
                            <Image
                              src={category.products[0].images[0]}
                              alt={category.name}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Package className="w-16 h-16 text-gray-400 group-hover:text-gray-500 transition-colors" />
                            </div>
                          )}
                          
                          {/* Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          
                          {/* Product Count Badge */}
                          <div className="absolute top-3 right-3">
                            <Badge className="bg-white/95 text-gray-900 hover:bg-white shadow-lg">
                              {category._count.products}
                            </Badge>
                          </div>
                        </div>

                        {/* Category Info */}
                        <div className="p-5">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                            {category.name}
                          </h3>
                          
                          {category.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {category.description}
                            </p>
                          )}

                          {/* Product Preview */}
                          {category.products.length > 0 && (
                            <div className="flex -space-x-2 mb-3">
                              {category.products.slice(0, 3).map((product, idx) => (
                                product.images[0] && (
                                  <div key={product.id} className="relative w-8 h-8 rounded-full border-2 border-white overflow-hidden" style={{ zIndex: 3 - idx }}>
                                    <Image
                                      src={product.images[0]}
                                      alt={product.name}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                )
                              ))}
                              {category._count.products > 3 && (
                                <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                                  +{category._count.products - 3}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700">
                              View Collection
                            </span>
                            <ChevronRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Browse All Products CTA */}
        <div className="mt-12 text-center">
          <div className="inline-flex flex-col items-center gap-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-100">
            <h3 className="text-2xl font-bold text-gray-900">
              Can't find what you're looking for?
            </h3>
            <p className="text-gray-600 max-w-md">
              Browse all products or use our search to find exactly what you need
            </p>
            <div className="flex gap-3">
              <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-blue-700">
                <Link href="/products">
                  <Package className="w-4 h-4 mr-2" />
                  View All Products
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/products?featured=true">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Featured Items
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}