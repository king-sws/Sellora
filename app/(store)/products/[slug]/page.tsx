/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(store)/products/[slug]/page.tsx
import { notFound } from 'next/navigation'
import { prisma } from '@/db/prisma'
import { AddToCartButton } from '@/components/store/add-to-cart-button'
import { RelatedProducts } from '@/components/store/related-products'
import { formatPrice, calculateDiscount } from '@/lib/utils'
import ProductReviews from './components/ProductReviews'
import Link from 'next/link'
import { Truck, MapPin, Lock, CheckCircle, Package, CreditCard, Zap, ShieldCheck, Calendar } from 'lucide-react'
import { EnhancedWishlistButton } from '@/components/store/wishlist-button'
import { SocialShare } from '@/components/store/SocialShare'
import VariantSelector from './components/VariantSelector'
import { ProductViewTracker } from './components/ProductViewTracker'
import { ProductImages } from '@/components/store/product-images'

interface ProductPageProps {
  params: {
    slug: string
  }
  searchParams: {
    variant?: string
  }
}

// Separate component for better organization
function ProductRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <span className="text-xs sm:text-sm font-semibold text-gray-900">
          {rating.toFixed(1)}
        </span>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                star <= Math.round(rating) 
                  ? 'text-amber-400' 
                  : 'text-gray-300'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      </div>
      <Link 
        href="#reviews" 
        className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
      >
        {count} {count === 1 ? 'rating' : 'ratings'}
      </Link>
    </div>
  )
}

// Price display component
function PriceDisplay({ 
  price, 
  comparePrice, 
  discount,
  size = 'large',
  isVariantPrice = false 
}: { 
  price: number
  comparePrice?: number | null
  discount: number
  size?: 'small' | 'large'
  isVariantPrice?: boolean
}) {
  const [dollars, cents] = price.toFixed(2).split('.')
  const sizeClasses = size === 'large' 
    ? 'text-2xl sm:text-3xl lg:text-4xl' 
    : 'text-xl sm:text-2xl'
  
  return (
    <div className="space-y-1.5 sm:space-y-2">
      {discount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded">
            -{discount}%
          </span>
          <span className="text-red-600 text-xs sm:text-sm font-medium">Limited time deal</span>
        </div>
      )}
      <div className="flex items-baseline gap-1 sm:gap-1.5">
        <span className="text-xs sm:text-sm text-gray-700 font-medium">$</span>
        <span className={`${sizeClasses} font-normal text-gray-900`}>
          {dollars}
        </span>
        <span className="text-sm sm:text-base text-gray-700 font-medium">
          {cents}
        </span>
        {isVariantPrice && (
          <span className="text-xs text-blue-600 ml-1 sm:ml-2">(variant price)</span>
        )}
      </div>
      {comparePrice && comparePrice > price && (
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <span className="text-gray-500">List Price:</span>
          <span className="text-gray-500 line-through">
            {formatPrice(comparePrice)}
          </span>
        </div>
      )}
      {discount > 0 && comparePrice && (
        <p className="text-xs sm:text-sm text-green-700 font-medium">
          You save {formatPrice(comparePrice - price)} ({discount}%)
        </p>
      )}
    </div>
  )
}

// Buy box component
function BuyBox({ 
  product, 
  discount,
  selectedVariant,
  productId,
  variantId 
}: { 
  product: any
  discount: number
  selectedVariant?: any
  productId: string
  variantId?: string
}) {
  // Use variant data if available, otherwise use product data
  const displayPrice = selectedVariant?.price ?? product.price
  const displayComparePrice = selectedVariant?.comparePrice ?? product.comparePrice
  const displayStock = selectedVariant?.stock ?? product.stock
  const displayDiscount = calculateDiscount(displayPrice, displayComparePrice)
  
  const isOutOfStock = displayStock === 0
  
  return (
    <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
      {/* Price Section */}
      <div className="p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-gray-50 to-white border-b border-gray-200">
        <PriceDisplay 
          price={displayPrice}
          comparePrice={displayComparePrice}
          discount={displayDiscount}
          size="small"
          isVariantPrice={!!selectedVariant}
        />
      </div>

      {/* Delivery & Shipping Info */}
      <div className="p-3 sm:p-4 lg:p-5 space-y-2.5 sm:space-y-3 border-b border-gray-200">
        <h3 className="text-xs sm:text-sm font-bold text-gray-900 mb-2 sm:mb-3">Delivery Information</h3>
        
        <div className="space-y-2 sm:space-y-2.5">
          <div className="flex items-start gap-2 sm:gap-3 group">
            <div className="p-1.5 sm:p-2 rounded-lg bg-teal-50 group-hover:bg-teal-100 transition-colors flex-shrink-0">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm lg:text-base text-gray-900 font-semibold">FREE Delivery</p>
              <p className="text-xs sm:text-sm text-gray-600">on orders over $50</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2 sm:gap-3 group">
            <div className="p-1.5 sm:p-2 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition-colors flex-shrink-0">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-700">
                Deliver to <span className="font-semibold text-gray-900">US</span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 sm:gap-3 group">
            <div className="p-1.5 sm:p-2 rounded-lg bg-gray-50 group-hover:bg-gray-100 transition-colors flex-shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-700">
                Ships from <span className="font-medium text-gray-900">our warehouse</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Usually ships within 1-2 days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Status */}
      <div className="p-3 sm:p-4 lg:p-5 border-b border-gray-200 bg-gradient-to-br from-white to-gray-50">
        {displayStock > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2.5 sm:p-3 bg-green-50 rounded-lg border border-green-100">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm lg:text-base text-green-700 font-semibold">In Stock</p>
                {displayStock <= 10 && (
                  <p className="text-xs sm:text-sm text-orange-600 font-medium mt-0.5">
                    Only {displayStock} left - order soon!
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2.5 sm:p-3 bg-red-50 rounded-lg border border-red-100">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <span className="w-2 h-2 bg-red-600 rounded-full"></span>
            </div>
            <p className="text-xs sm:text-sm lg:text-base text-red-700 font-semibold">Currently Unavailable</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-3 sm:p-4 lg:p-5 space-y-2 sm:space-y-2.5 bg-white">
        <AddToCartButton 
          productId={productId}
          variantId={variantId}
          disabled={displayStock === 0}
          stock={displayStock}
        />

        {/* Buy Now Button */}
        {isOutOfStock ? (
          <button
            disabled
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base bg-gray-200 text-gray-500 cursor-not-allowed transition-all"
          >
            <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Buy Now</span>
          </button>
        ) : (
          <Link
            href={`/checkout?product=${productId}${variantId ? `&variant=${variantId}` : ''}&quantity=1`}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base transition-all bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            <span>Buy Now</span>
          </Link>
        )}
      </div>

      {/* Trust Badges & Security */}
      <div className="p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-gray-50 to-white space-y-3 sm:space-y-4">
        {/* Features List */}
        <div className="space-y-2 border-t border-gray-200 pt-3 sm:pt-4">
          <div className="flex items-start gap-2 group">
            <div className="p-1 sm:p-1.5 rounded-md bg-teal-50 group-hover:bg-teal-100 transition-colors flex-shrink-0">
              <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-teal-600" />
            </div>
            <span className="text-xs sm:text-sm text-gray-700 leading-relaxed">30-day return policy</span>
          </div>
          
          <div className="flex items-start gap-2 group">
            <div className="p-1 sm:p-1.5 rounded-md bg-purple-50 group-hover:bg-purple-100 transition-colors flex-shrink-0">
              <Package className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-purple-600" />
            </div>
            <span className="text-xs sm:text-sm text-gray-700 leading-relaxed">Ships from our warehouse</span>
          </div>
          
          <div className="flex items-start gap-2 group">
            <div className="p-1 sm:p-1.5 rounded-md bg-blue-50 group-hover:bg-blue-100 transition-colors flex-shrink-0">
              <CreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-blue-600" />
            </div>
            <span className="text-xs sm:text-sm text-gray-700 leading-relaxed">Secure payment processing</span>
          </div>

          <div className="flex items-start gap-2 group">
            <div className="p-1 sm:p-1.5 rounded-md bg-green-50 group-hover:bg-green-100 transition-colors flex-shrink-0">
              <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-green-600" />
            </div>
            <span className="text-xs sm:text-sm text-gray-700 leading-relaxed">Quality guaranteed</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  // Fetch product with variants
  const product = await prisma.product.findUnique({
    where: { 
      slug: params.slug,
      isActive: true,
      deletedAt: null
    },
    include: {
      category: true,
      brand: true,
      variants: {
        where: {
          isActive: true
        },
        include: {
          _count: {
            select: {
              orderItems: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      },
      reviews: {
        include: {
          user: {
            select: {
              name: true,
              image: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      },
      _count: {
        select: { reviews: true }
      }
    }
  })

  if (!product) {
    notFound()
  }

  // Handle variant selection
  const selectedVariantId = searchParams?.variant
  const selectedVariant = selectedVariantId 
    ? product.variants.find(v => v.id === selectedVariantId)
    : product.variants[0] // Default to first variant if available

  // Determine which images to show
  const displayImages = selectedVariant?.images && selectedVariant.images.length > 0
    ? selectedVariant.images
    : product.images

  const averageRating = product.reviews.length > 0
    ? product.reviews.reduce((acc, review) => acc + review.rating, 0) / product.reviews.length
    : 0

  // Calculate discount based on selected variant or product
  const displayPrice = selectedVariant?.price ?? product.price
  const displayComparePrice = selectedVariant?.comparePrice ?? product.comparePrice
  const discount = calculateDiscount(displayPrice, displayComparePrice)

  // Get related products
  const relatedProducts = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      isActive: true,
      deletedAt: null,
      stock: { gt: 0 },
      id: { not: product.id }
    },
    include: {
      category: true,
      _count: { select: { reviews: true } }
    },
    take: 4,
  })

  // Parse description into bullet points
  const descriptionPoints = product.description
    .split(/[.!?]/)
    .filter(s => s.trim() && s.length > 10)
    .slice(0, 5)

  // Check if product has variants
  const hasVariants = product.variants && product.variants.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <ProductViewTracker productId={product.id} />
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <nav className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-2.5 sm:py-3">
          <ol className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 flex-wrap">
            <li>
              <Link href="/" className="hover:text-blue-600 hover:underline transition-colors">
                Home
              </Link>
              
            </li>
            {product.category && (
              <>
                <li className="text-gray-400">/</li>
                  <Link href="/categories" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    Categories
                  </Link>
                <li className="text-gray-400">/</li>
                <li>
                  <Link 
                    href={`/categories/${product.category.slug}`} 
                    className="hover:text-blue-600 hover:underline transition-colors"
                  >
                    {product.category.name}
                  </Link>
                </li>
              </>
            )}
            <li className="text-gray-400">/</li>
            <li className="text-gray-900 font-medium truncate max-w-[150px] sm:max-w-xs md:max-w-md">
              {product.name}
            </li>
          </ol>
        </nav>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
          
          {/* Left Column - Product Images (Mobile & Desktop) */}
          <div className="lg:col-span-5 mb-4 sm:mb-6 lg:mb-0">
            <div className="lg:sticky lg:top-24">
              <ProductImages 
                images={displayImages} 
                productName={selectedVariant?.name || product.name} 
              />
              
              {/* Buy Box on Mobile - Directly Below Images */}
              <div className="lg:hidden mt-4">
                <BuyBox 
                  product={product} 
                  discount={discount}
                  selectedVariant={selectedVariant}
                  productId={product.id}
                  variantId={selectedVariant?.id}
                />
              </div>
            </div>
          </div>

          {/* Middle Column - Product Info */}
          <div className="lg:col-span-4 space-y-4 sm:space-y-5">
            {/* Product Title */}
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-medium text-gray-900 mb-2 sm:mb-3 leading-tight">
                {product.name}
              </h1>
              
              {/* Rating & Reviews */}
              <div className="mb-2 sm:mb-3">
                <ProductRating 
                  rating={averageRating} 
                  count={product._count.reviews} 
                />
              </div>

              {/* Brand & Category */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center text-xs sm:text-sm">
                {product.brand && (
                  <span className="text-gray-700">
                    Brand: <span className="font-semibold text-gray-900">{product.brand.name}</span>
                  </span>
                )}
                {product.category && (
                  <>
                    {product.brand && <span className="text-gray-400">|</span>}
                    <Link 
                      href={`/category/${product.category.slug}`}
                      className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                    >
                      Visit the {product.category.name} Store
                    </Link>
                  </>
                )}
              </div>
            </div>

            <hr className="border-gray-200" />

            {/* Variant Selector - Only show if product has variants */}
            {hasVariants ? (
              <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                <VariantSelector
                  variants={product.variants}
                  selectedVariant={selectedVariant}
                  productSlug={product.slug}
                  productImages={product.images}
                />
              </div>
            ) : (
              <>
                <PriceDisplay 
                  price={product.price}
                  comparePrice={product.comparePrice}
                  discount={discount}
                />
                <hr className="border-gray-200" />
              </>
            )}

            {/* Quick Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <EnhancedWishlistButton
                productId={product.id}
                size="sm"
                variant="ghost"
                iconOnly
              />
              <SocialShare
                productName={product.name}
                productUrl={`/products/${product.slug}`}
              />
            </div>

            <hr className="border-gray-200" />

            {/* Description */}
            <div>
              <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-gray-900">About this item</h2>
              <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-gray-700 leading-relaxed">
                {descriptionPoints.map((point, idx) => (
                  <li key={idx} className="flex gap-2 sm:gap-3">
                    <span className="text-blue-600 font-bold flex-shrink-0 mt-0.5">•</span>
                    <span>{point.trim()}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Product Details Table */}
            <div>
              <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-gray-900">Product details</h2>
              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200 overflow-hidden shadow-sm">
                {(selectedVariant?.sku || product.sku) && (
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 py-2.5 sm:py-3 px-3 sm:px-4 hover:bg-gray-50 transition-colors">
                    <span className="text-xs sm:text-sm font-medium text-gray-600">SKU</span>
                    <span className="col-span-2 text-xs sm:text-sm text-gray-900 font-mono break-all">
                      {selectedVariant?.sku || product.sku}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 py-2.5 sm:py-3 px-3 sm:px-4 hover:bg-gray-50 transition-colors">
                  <span className="text-xs sm:text-sm font-medium text-gray-600">Category</span>
                  <span className="col-span-2 text-xs sm:text-sm text-gray-900">
                    {product.category?.name || 'Uncategorized'}
                  </span>
                </div>
                {product.brand && (
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 py-2.5 sm:py-3 px-3 sm:px-4 hover:bg-gray-50 transition-colors">
                    <span className="text-xs sm:text-sm font-medium text-gray-600">Brand</span>
                    <span className="col-span-2 text-xs sm:text-sm text-gray-900">
                      {product.brand.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Buy Box (Desktop Only) */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="lg:sticky lg:top-24">
              <BuyBox 
                product={product} 
                discount={discount}
                selectedVariant={selectedVariant}
                productId={product.id}
                variantId={selectedVariant?.id}
              />
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-8 sm:mt-12 lg:mt-16" id="reviews">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <ProductReviews
              productId={product.id} 
              productName={product.name} 
            />
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-8 sm:mt-12 lg:mt-16">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-4 sm:mb-6 text-gray-900">
              Customers who viewed this also viewed
            </h2>
            <RelatedProducts products={relatedProducts} />
          </div>
        )}
      </div>
    </div>
  )
}