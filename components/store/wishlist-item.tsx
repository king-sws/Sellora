// components/store/wishlist-item.tsx
'use client'

import { useState, useCallback, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useWishlist } from '@/hooks/use-wishlist'
import { useCart } from '@/hooks/use-cart'
import { Trash2, ShoppingCart, Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface WishlistItemProps {
  item: {
    id: string
    productId: string
    addedAt: string
    product: {
      id: string
      name: string
      slug: string
      price: number
      salePrice?: number
      stock: number
      sku?: string
      images: string[]
      isActive: boolean
      category: { name: string; id: string } | null
    }
  }
}

export function WishlistItem({ item }: WishlistItemProps) {
  const { removeFromWishlist } = useWishlist()
  const { addToCart, isInCart, getCartItemQuantity } = useCart()
  
  const [isRemoving, setIsRemoving] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)

  const { product } = item

  // Memoized calculations
  const { 
    currentPrice, 
    hasDiscount, 
    discountPercent,
    isOutOfStock,
    isLowStock,
    isAlreadyInCart,
    cartQuantity
  } = useMemo(() => {
    const price = product.salePrice || product.price
    const discount = product.salePrice && product.salePrice < product.price
    const percent = discount
      ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
      : 0
    
    return {
      currentPrice: price,
      hasDiscount: discount,
      discountPercent: percent,
      isOutOfStock: product.stock === 0 || !product.isActive,
      isLowStock: product.stock <= 5 && product.stock > 0,
      isAlreadyInCart: isInCart(product.id),
      cartQuantity: getCartItemQuantity(product.id)
    }
  }, [product, isInCart, getCartItemQuantity])

  const handleRemove = useCallback(async () => {
    if (isRemoving) return
    
    setIsRemoving(true)
    try {
      await removeFromWishlist(product.id)
    } finally {
      setIsRemoving(false)
    }
  }, [isRemoving, removeFromWishlist, product.id])

  const handleAddToCart = useCallback(async () => {
    if (isAddingToCart || isOutOfStock) return
    
    setIsAddingToCart(true)
    try {
      const result = await addToCart(product.id, 1)
      if (result.success) {
        // Optionally remove from wishlist after adding to cart
        // await removeFromWishlist(product.id, false)
      }
    } finally {
      setIsAddingToCart(false)
    }
  }, [isAddingToCart, isOutOfStock, addToCart, product.id])

  const addedDate = useMemo(() => {
    return new Date(item.addedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }, [item.addedAt])

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Product Image */}
          <Link 
            href={`/products/${product.slug}`}
            className="relative aspect-square sm:aspect-[4/3] w-full sm:w-48 bg-muted overflow-hidden group"
          >
            {product.images[0] ? (
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 100vw, 192px"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                priority={false}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No Image
              </div>
            )}
            
            {/* Badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {hasDiscount && (
                <Badge className="bg-destructive text-destructive-foreground">
                  -{discountPercent}%
                </Badge>
              )}
              
              {isOutOfStock && (
                <Badge variant="secondary" className="bg-gray-900 text-white">
                  Out of Stock
                </Badge>
              )}
            </div>

            {/* External link icon */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="w-4 h-4 text-white drop-shadow-sm" />
            </div>
          </Link>

          {/* Product Details */}
          <div className="flex-1 p-4 sm:p-6">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex-1">
                <Link 
                  href={`/products/${product.slug}`}
                  className="block group"
                >
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                    {product.name}
                  </h3>
                </Link>

                {/* Category & SKU */}
                <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                  {product.category && (
                    <span>{product.category.name}</span>
                  )}
                  {product.sku && (
                    <>
                      <span>•</span>
                      <span>SKU: {product.sku}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>Added {addedDate}</span>
                </div>

                {/* Stock Status */}
                {!isOutOfStock && isLowStock && (
                  <div className="flex items-center gap-1 mb-3 text-orange-600 dark:text-orange-500 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>Only {product.stock} left</span>
                  </div>
                )}

                {isOutOfStock && (
                  <div className="flex items-center gap-1 mb-3 text-destructive text-sm font-medium">
                    <AlertCircle className="w-4 h-4" />
                    <span>{!product.isActive ? 'No longer available' : 'Out of stock'}</span>
                  </div>
                )}

                {/* Price */}
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-2xl font-bold text-foreground">
                    ${currentPrice.toFixed(2)}
                  </span>
                  {hasDiscount && (
                    <span className="text-lg text-muted-foreground line-through">
                      ${product.price.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Cart Status */}
                {isAlreadyInCart && (
                  <div className="mb-4 p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="text-sm text-green-800 dark:text-green-200">
                      ✓ In cart ({cartQuantity} {cartQuantity === 1 ? 'item' : 'items'})
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleAddToCart}
                        disabled={isAddingToCart || isOutOfStock}
                        className="flex-1"
                        size="sm"
                      >
                        {isAddingToCart ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <ShoppingCart className="w-4 h-4 mr-2" />
                        )}
                        {isAlreadyInCart ? 'Add More' : 'Add to Cart'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isOutOfStock ? 'Product unavailable' : 'Add to shopping cart'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemove}
                        disabled={isRemoving}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {isRemoving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove from wishlist</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

