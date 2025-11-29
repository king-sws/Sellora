"use client"

import { useState, useEffect } from 'react'
import Link from "next/link"
import Image from "next/image"
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ShoppingCart, Check, Loader2, AlertCircle, Star } from "lucide-react"
import { formatPrice, calculateDiscount } from "@/lib/utils"
import { useCart } from "@/hooks/use-cart"
import { EnhancedWishlistButton } from "./wishlist-button"

interface ProductCardProps {
  product: {
    id: string
    name: string
    slug: string
    price: number
    stock: number
    comparePrice: number | null
    images: string[]
    category: { name: string } | null
    _count: { reviews: number }
  }
  viewMode?: 'grid' | 'list' | 'compact'
}

export function ProductCard({ product, viewMode = 'grid' }: ProductCardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { 
    addToCart, 
    getCartItemQuantity,
    isInCart,
    addToRecentlyViewed 
  } = useCart()
  
  // Check if product is a TV - compute once at component initialization
  const isTVProduct = (() => {
    const name = product.name.toLowerCase()
    const tvKeywords = ['tv', 'television', 's25', 'smart tv', 'apple']
    return tvKeywords.some(keyword => name.includes(keyword))
  })()
  
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const [imageStyle, setImageStyle] = useState<'cover' | 'contain'>(
    isTVProduct ? 'contain' : 'cover'
  )

  const discount = calculateDiscount(product.price, product.comparePrice)
  const isOutOfStock = product.stock === 0
  const isLowStock = product.stock > 0 && product.stock <= 5
  
  const cartQuantity = getCartItemQuantity(product.id)
  const inCart = isInCart(product.id)
  const maxAvailable = product.stock - cartQuantity

  useEffect(() => {
    addToRecentlyViewed(product.id)
  }, [product.id, addToRecentlyViewed])

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // If it's a TV product, keep it as 'contain' - don't analyze
    if (isTVProduct) {
      return
    }

    const img = e.currentTarget
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return

    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    
    try {
      ctx.drawImage(img, 0, 0)
      
      const checkPoints = [
        { x: 0, y: 0 },
        { x: canvas.width - 1, y: 0 },
        { x: 0, y: canvas.height - 1 },
        { x: canvas.width - 1, y: canvas.height - 1 },
        { x: Math.floor(canvas.width / 2), y: 0 },
        { x: 0, y: Math.floor(canvas.height / 2) },
      ]

      let hasTransparency = false
      let pureWhiteCorners = 0

      for (const point of checkPoints) {
        const pixel = ctx.getImageData(point.x, point.y, 1, 1).data
        
        if (pixel[3] < 255) {
          hasTransparency = true
          break
        }
        
        if (pixel[0] > 250 && pixel[1] > 250 && pixel[2] > 250) {
          pureWhiteCorners++
        }
      }

      if (hasTransparency || pureWhiteCorners >= 4) {
        setImageStyle('contain')
      } else {
        setImageStyle('cover')
      }
    } catch (err) {
      console.log('Could not analyze image, using cover')
      setImageStyle('cover')
    }
  }

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!session) {
      router.push(`/auth/sign-in?redirect=/products/${product.slug}`)
      return
    }

    if (isOutOfStock || maxAvailable <= 0) {
      return
    }

    setIsAddingToCart(true)
    
    try {
      const result = await addToCart(product.id, 1, {
        showNotification: true,
        skipStockCheck: false
      })
      
      if (result.success) {
        setJustAdded(true)
        setTimeout(() => setJustAdded(false), 2000)
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
    } finally {
      setIsAddingToCart(false)
    }
  }

  const getButtonContent = () => {
    if (isAddingToCart) {
      return <Loader2 className="w-4 h-4 text-gray-700 animate-spin" />
    }
    if (justAdded) {
      return <Check className="w-4 h-4 text-green-600" />
    }
    if (isOutOfStock) {
      return <AlertCircle className="w-4 h-4 text-gray-400" />
    }
    if (maxAvailable <= 0 && inCart) {
      return <Check className="w-4 h-4 text-blue-600" />
    }
    return <ShoppingCart className="w-4 h-4 text-gray-700" />
  }

  const getButtonText = () => {
    if (isAddingToCart) return "Adding..."
    if (justAdded) return "Added!"
    if (isOutOfStock) return "Out of Stock"
    if (maxAvailable <= 0) return "Max in Cart"
    return "Add to Cart"
  }

  const isButtonDisabled = isOutOfStock || isAddingToCart || maxAvailable <= 0

  // LIST VIEW MODE - Wide horizontal card
  if (viewMode === 'list') {
    return (
      <div className="group bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200">
        <div className="grid grid-cols-[200px_1fr] sm:grid-cols-[240px_1fr] gap-4 sm:gap-6 p-4">
          
          {/* Image Column */}
          <Link href={`/products/${product.slug}`} className="relative aspect-square overflow-hidden bg-white rounded-lg flex-shrink-0">
            {product.images?.[0] ? (
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                className={`group-hover:scale-105 transition-transform duration-500 ${
                  imageStyle === 'contain' ? 'object-contain p-4' : 'object-cover'
                }`}
                sizes="240px"
                onLoad={handleImageLoad}
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                No Image
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
              {discount > 0 && (
                <div className="bg-red-600 text-white px-2 py-0.5 rounded text-xs font-semibold shadow-md">
                  -{discount}%
                </div>
              )}
              {isOutOfStock && (
                <div className="bg-gray-800 text-white px-2 py-0.5 rounded text-xs font-semibold shadow-md">
                  OUT OF STOCK
                </div>
              )}
            </div>
          </Link>

          {/* Product Details Column */}
          <div className="flex flex-col justify-between min-w-0">
            <Link href={`/products/${product.slug}`}>
              <div className="space-y-2">
                
                {/* Category */}
                {product.category && (
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    {product.category.name}
                  </p>
                )}

                {/* Product Name */}
                <h3 className="font-semibold text-base sm:text-lg text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {product.name}
                </h3>

                {/* Reviews */}
                {product._count.reviews > 0 && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-gray-400">({product._count.reviews})</span>
                  </div>
                )}

                {/* Price Section */}
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xl sm:text-2xl font-bold text-gray-900">
                    {formatPrice(product.price)}
                  </span>
                  {product.comparePrice && product.comparePrice > product.price && (
                    <span className="text-sm text-gray-500 line-through">
                      {formatPrice(product.comparePrice)}
                    </span>
                  )}
                </div>

                {/* Stock Status */}
                {isLowStock && !isOutOfStock && (
                  <p className="text-sm text-orange-600 font-medium">
                    Only {product.stock} left
                  </p>
                )}

                {/* Cart Status Badges */}
                <div className="flex items-center gap-2">
                  {inCart && maxAvailable > 0 && (
                    <div className="inline-flex items-center gap-1 bg-blue-600 text-white px-2.5 py-1 rounded-md text-xs font-semibold">
                      <Check className="w-3 h-3" />
                      {cartQuantity} in Cart
                    </div>
                  )}

                  {inCart && maxAvailable <= 0 && (
                    <div className="inline-flex items-center bg-gray-700 text-white px-2.5 py-1 rounded-md text-xs font-semibold">
                      Max Quantity
                    </div>
                  )}
                </div>
              </div>
            </Link>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleAddToCart}
                disabled={isButtonDisabled}
                className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm sm:text-base rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                aria-label={
                  isOutOfStock 
                    ? "Out of stock" 
                    : maxAvailable <= 0 
                    ? "Maximum quantity in cart" 
                    : "Add to cart"
                }
              >
                {isAddingToCart ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span className="hidden sm:inline">Adding...</span>
                  </>
                ) : justAdded ? (
                  <>
                    <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Added!</span>
                  </>
                ) : (
                  <>
                    {!isOutOfStock && maxAvailable > 0 && <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />}
                    {isOutOfStock && <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
                    {maxAvailable <= 0 && !isOutOfStock && <Check className="w-4 h-4 sm:w-5 sm:h-5" />}
                    <span className="hidden sm:inline">{getButtonText()}</span>
                    <span className="sm:hidden text-xs">{isOutOfStock ? "Out" : justAdded ? "✓" : "Add"}</span>
                  </>
                )}
              </button>

              <div onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}>
                <EnhancedWishlistButton
                  productId={product.id}
                  size="default"
                  variant="outline"
                  className="h-full px-3 sm:px-4"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // GRID VIEW MODE (Default and Compact share same structure with different spacing)
  return (
    <div className="group relative bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200">
      <Link href={`/products/${product.slug}`} className="block">
        {/* Product Image Container */}
        <div className="relative aspect-square overflow-hidden bg-white">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className={`group-hover:scale-105 transition-transform duration-500 ${
                imageStyle === 'contain' ? 'object-contain p-4' : 'object-cover'
              }`}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onLoad={handleImageLoad}
              crossOrigin="anonymous"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
              No Image Available
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
            {discount > 0 && (
              <div className="bg-red-600 text-white px-2.5 py-1 rounded-md text-xs font-semibold shadow-md">
                SAVE {discount}%
              </div>
            )}
            {isOutOfStock && (
              <div className="bg-gray-800 text-white px-2.5 py-1 rounded-md text-xs font-semibold shadow-md">
                OUT OF STOCK
              </div>
            )}
            {isLowStock && !isOutOfStock && (
              <div className="bg-orange-500 text-white px-2.5 py-1 rounded-md text-xs font-semibold shadow-md">
                ONLY {product.stock} LEFT
              </div>
            )}
          </div>

          {/* Floating Action Buttons */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
            <EnhancedWishlistButton
              productId={product.id}
              size="sm"
              variant="ghost"
              iconOnly
              className="bg-white/90 hover:bg-white shadow-md rounded-lg border border-gray-200"
            />

            <button
              onClick={handleAddToCart}
              disabled={isButtonDisabled}
              className="p-2 bg-white/90 hover:bg-white shadow-md rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200"
              aria-label={
                isOutOfStock 
                  ? "Out of stock" 
                  : maxAvailable <= 0 
                  ? "Maximum quantity in cart" 
                  : "Add to cart"
              }
              title={
                isOutOfStock 
                  ? "Out of stock" 
                  : maxAvailable <= 0 
                  ? "Maximum quantity already in cart" 
                  : inCart
                  ? `Add more (${cartQuantity} in cart)`
                  : "Add to cart"
              }
            >
              {getButtonContent()}
            </button>
          </div>

          {/* Already in Cart Indicator */}
          {inCart && maxAvailable > 0 && (
            <div className="absolute bottom-3 left-3 bg-blue-600 text-white px-2.5 py-1 rounded-md text-xs font-semibold shadow-md flex items-center gap-1 z-10">
              <Check className="w-3 h-3" />
              {cartQuantity} in Cart
            </div>
          )}

          {/* Max Quantity Reached */}
          {inCart && maxAvailable <= 0 && (
            <div className="absolute bottom-3 left-3 bg-gray-700 text-white px-2.5 py-1 rounded-md text-xs font-semibold shadow-md z-10">
              Max Quantity
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className={viewMode === 'compact' ? 'p-3' : 'p-4'}>
          {/* Category */}
          {product.category && (
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {product.category.name}
            </p>
          )}

          {/* Product Name */}
          <h3 className={`font-semibold text-gray-800 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors ${
            viewMode === 'compact' ? 'text-sm min-h-[2.5rem]' : 'min-h-[3rem]'
          }`}>
            {product.name}
          </h3>

          {/* Price Section */}
          <div className="flex items-baseline gap-2 mb-2">
            <span className={`font-bold text-gray-900 ${viewMode === 'compact' ? 'text-base' : 'text-lg'}`}>
              {formatPrice(product.price)}
            </span>
            {product.comparePrice && product.comparePrice > product.price && (
              <span className="text-sm text-gray-500 line-through">
                {formatPrice(product.comparePrice)}
              </span>
            )}
          </div>

          {/* Reviews */}
          {product._count.reviews > 0 && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-gray-400">({product._count.reviews})</span>
            </div>
          )}
        </div>
      </Link>
    </div>
  )
}