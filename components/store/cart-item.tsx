/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */
// components/store/cart-item.tsx
'use client'

import { useState, useCallback, useMemo, useEffect, useRef, memo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/hooks/use-cart'
import { Trash2, Heart, Loader2, Minus, Plus, AlertCircle, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface CartItemProps {
  item: {
    id: string
    quantity: number
    selectedVariant?: string
    product: {
      id: string
      name: string
      price: number
      salePrice?: number
      images: string[]
      stock: number
      slug: string
      sku?: string
      category: { name: string; id: string } | null
      maxQuantityPerOrder?: number
      minQuantityPerOrder?: number
    }
    addedAt: string
  }
  compact?: boolean
  onRemoveComplete?: () => void
}

// Memoized Image Component
const ProductImage = memo(({ 
  src, 
  alt, 
  hasDiscount, 
  discountPercent, 
  isOutOfStock,
  slug 
}: { 
  src: string
  alt: string
  hasDiscount: number | boolean | undefined
  discountPercent: number
  isOutOfStock: boolean
  slug: string
}) => {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  return (
    <Link 
      href={`/products/${slug}`}
      className="relative flex-shrink-0 w-full sm:w-32 h-40 sm:h-32 bg-muted rounded-lg overflow-hidden group"
    >
      {imageLoading && (
        <Skeleton className="w-full h-full absolute inset-0" />
      )}
      
      {!imageError && src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, 128px"
          className={cn(
            "object-cover group-hover:scale-105 transition-transform duration-300",
            imageLoading && "opacity-0"
          )}
          onLoad={() => setImageLoading(false)}
          onError={() => {
            setImageError(true)
            setImageLoading(false)
          }}
          priority={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          <ImageIcon className="w-8 h-8" />
        </div>
      )}
      
      {hasDiscount && (
        <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground shadow-lg">
          -{discountPercent}%
        </Badge>
      )}
      
      {isOutOfStock && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm"
        >
          <span className="text-white font-semibold text-sm">Out of Stock</span>
        </motion.div>
      )}
    </Link>
  )
})
ProductImage.displayName = 'ProductImage'

export const CartItem = memo(({ item, compact = false, onRemoveComplete }: CartItemProps) => {
  const {
    updateQuantity,
    removeFromCart,
    addToWishlist,
    saveForLater,
    isInWishlist,
  } = useCart()

  const [isUpdating, setIsUpdating] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [quantityError, setQuantityError] = useState<string | null>(null)
  const [localQuantity, setLocalQuantity] = useState(item.quantity)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousQuantityRef = useRef(item.quantity)

  const { product, quantity } = item

  // Sync local quantity with prop changes
  useEffect(() => {
    if (quantity !== previousQuantityRef.current) {
      setLocalQuantity(quantity)
      previousQuantityRef.current = quantity
    }
  }, [quantity])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [])

  // Memoized calculations
  const { 
    currentPrice, 
    hasDiscount, 
    discountPercent, 
    itemTotal,
    maxQuantity,
    minQuantity,
    isLowStock,
    isOutOfStock,
    discountAmount,
    savings
  } = useMemo(() => {
    const price = product.salePrice || product.price
    const discount = product.salePrice && product.salePrice < product.price
    const percent = discount
      ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
      : 0
    const discountAmt = discount ? product.price - product.salePrice! : 0
    const totalSavings = discountAmt * quantity
    
    return {
      currentPrice: price,
      hasDiscount: discount,
      discountPercent: percent,
      itemTotal: price * quantity,
      maxQuantity: Math.min(product.stock, product.maxQuantityPerOrder || 99),
      minQuantity: product.minQuantityPerOrder || 1,
      isLowStock: product.stock <= 5 && product.stock > 0,
      isOutOfStock: product.stock === 0,
      discountAmount: discountAmt,
      savings: totalSavings
    }
  }, [product, quantity])

  const isInWishlistAlready = useMemo(() => isInWishlist(product.id), [isInWishlist, product.id])

  // Debounced quantity update with better error handling
  const handleQuantityChange = useCallback(async (newQuantity: number) => {
    // Clear previous timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }

    // Validation
    if (newQuantity < minQuantity) {
      setQuantityError(`Minimum quantity is ${minQuantity}`)
      setLocalQuantity(quantity)
      return
    }

    if (newQuantity > maxQuantity) {
      setQuantityError(`Maximum quantity is ${maxQuantity}`)
      setLocalQuantity(quantity)
      return
    }

    if (newQuantity > product.stock) {
      setQuantityError(`Only ${product.stock} items available`)
      setLocalQuantity(quantity)
      return
    }

    setQuantityError(null)
    setLocalQuantity(newQuantity)

    // Debounce the API call
    updateTimeoutRef.current = setTimeout(async () => {
      setIsUpdating(true)
      try {
        const result = await updateQuantity(item.id, newQuantity)
        if (!result.success) {
          setQuantityError(result.error || 'Failed to update quantity')
          setLocalQuantity(quantity)
        }
      } catch (error) {
        setQuantityError('Failed to update quantity')
        setLocalQuantity(quantity)
      } finally {
        setIsUpdating(false)
      }
    }, 500)
  }, [item.id, minQuantity, maxQuantity, product.stock, quantity, updateQuantity])

  // Quick increment/decrement without debounce
  const handleIncrement = useCallback(() => {
    const newQuantity = localQuantity + 1
    if (newQuantity <= maxQuantity && newQuantity <= product.stock) {
      handleQuantityChange(newQuantity)
    } else {
      setQuantityError(`Maximum quantity is ${Math.min(maxQuantity, product.stock)}`)
      setTimeout(() => setQuantityError(null), 3000)
    }
  }, [localQuantity, maxQuantity, product.stock, handleQuantityChange])

  const handleDecrement = useCallback(() => {
    const newQuantity = localQuantity - 1
    if (newQuantity >= minQuantity) {
      handleQuantityChange(newQuantity)
    } else {
      setQuantityError(`Minimum quantity is ${minQuantity}`)
      setTimeout(() => setQuantityError(null), 3000)
    }
  }, [localQuantity, minQuantity, handleQuantityChange])

  // Handle remove with proper cleanup
  const handleRemove = useCallback(async () => {
    if (isRemoving) return
    
    setShowRemoveDialog(false)
    setIsRemoving(true)

    try {
      await removeFromCart(item.id)
      onRemoveComplete?.()
    } catch (error) {
      console.error('Failed to remove item:', error)
      setIsRemoving(false)
    }
  }, [isRemoving, removeFromCart, item.id, onRemoveComplete])

  const handleAddToWishlist = useCallback(async () => {
    if (isInWishlistAlready) return
    
    setIsUpdating(true)
    try {
      await addToWishlist(product.id)
      await removeFromCart(item.id, false)
      onRemoveComplete?.()
    } catch (error) {
      console.error('Failed to add to wishlist:', error)
    } finally {
      setIsUpdating(false)
    }
  }, [isInWishlistAlready, addToWishlist, product.id, removeFromCart, item.id, onRemoveComplete])

  // Handle input blur - finalize quantity
  const handleQuantityBlur = useCallback(() => {
    if (localQuantity !== quantity) {
      handleQuantityChange(localQuantity)
    }
  }, [localQuantity, quantity, handleQuantityChange])

  // Handle keyboard input
  const handleQuantityKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      handleIncrement()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      handleDecrement()
    }
  }, [handleIncrement, handleDecrement])

  // Compact view for mini cart
  if (compact) {
    return (
      <>
        <motion.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -100, height: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md",
            isRemoving && "pointer-events-none opacity-50"
          )}
        >
          <Link href={`/products/${product.slug}`} className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-muted group">
            {product.images[0] ? (
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                sizes="64px"
                className="object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </Link>
          
          <div className="flex-1 min-w-0">
            <Link href={`/products/${product.slug}`} className="font-medium text-sm line-clamp-1 hover:text-primary transition-colors">
              {product.name}
            </Link>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-semibold">${currentPrice.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground">× {quantity}</span>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-colors" 
            onClick={() => setShowRemoveDialog(true)}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </motion.div>

        <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove item?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove <strong>{product.name}</strong> from your cart?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemove} className="bg-destructive hover:bg-destructive/90">
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  // Full cart item view
  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ 
          opacity: 0, 
          x: -100,
          height: 0,
          marginTop: 0,
          marginBottom: 0,
          paddingTop: 0,
          paddingBottom: 0,
          transition: { duration: 0.3 }
        }}
        transition={{ duration: 0.3 }}
        className={cn(
          "px-4 sm:px-6 py-4 sm:py-6 transition-all duration-200 border-b last:border-b-0 hover:bg-muted/30",
          isRemoving && "pointer-events-none"
        )}
      >
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          {/* Product Image */}
          <ProductImage
            src={product.images[0]}
            alt={product.name}
            hasDiscount={hasDiscount}
            discountPercent={discountPercent}
            isOutOfStock={isOutOfStock}
            slug={product.slug}
          />

          {/* Product Details */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-4">
              <div className="flex-1 min-w-0">
                {/* Product Name */}
                <Link 
                  href={`/products/${product.slug}`}
                  className="text-base sm:text-lg font-semibold text-foreground hover:text-primary transition-colors line-clamp-2 block"
                >
                  {product.name}
                </Link>

                {/* Category & SKU */}
                <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-muted-foreground">
                  {product.category && (
                    <span>{product.category.name}</span>
                  )}
                  {product.sku && (
                    <>
                      <span>•</span>
                      <span>SKU: {product.sku}</span>
                    </>
                  )}
                </div>

                {/* Stock Status */}
                {!isOutOfStock && isLowStock && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1 mt-2 text-orange-600 dark:text-orange-500 text-xs sm:text-sm"
                  >
                    <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Only {product.stock} left in stock</span>
                  </motion.div>
                )}

                {isOutOfStock && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1 mt-2 text-destructive text-xs sm:text-sm font-medium"
                  >
                    <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Out of stock</span>
                  </motion.div>
                )}

                {/* Price */}
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 mt-2 sm:mt-3">
                  <div className="flex items-baseline gap-2">
                    <motion.span 
                      key={currentPrice}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      className="text-xl sm:text-2xl font-bold text-foreground"
                    >
                      ${currentPrice.toFixed(2)}
                    </motion.span>
                    {hasDiscount && (
                      <span className="text-base sm:text-lg text-muted-foreground line-through">
                        ${product.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {hasDiscount && savings > 0 && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs sm:text-sm text-green-600 dark:text-green-500 font-medium"
                    >
                      Save ${savings.toFixed(2)}
                    </motion.span>
                  )}
                </div>
              </div>

              {/* Item Total - Desktop */}
              <div className="hidden sm:block text-right">
                <div className="text-sm text-muted-foreground mb-1">Total</div>
                <motion.div 
                  key={itemTotal}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="text-xl font-bold text-foreground"
                >
                  ${itemTotal.toFixed(2)}
                </motion.div>
              </div>
            </div>

            {/* Quantity Controls */}
            <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center border border-input rounded-lg bg-background shadow-sm">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 sm:h-10 sm:w-10 rounded-l-lg hover:bg-accent transition-colors"
                        onClick={handleDecrement}
                        disabled={isUpdating || localQuantity <= minQuantity || isOutOfStock}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Decrease quantity</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              
                <Input
                  type="number"
                  value={localQuantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || minQuantity
                    setLocalQuantity(val)
                  }}
                  onBlur={handleQuantityBlur}
                  onKeyDown={handleQuantityKeyDown}
                  disabled={isUpdating || isOutOfStock}
                  className="h-9 sm:h-10 w-14 sm:w-16 text-center border-0 border-x focus-visible:ring-0 focus-visible:ring-offset-0 font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min={minQuantity}
                  max={maxQuantity}
                />
              
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 sm:h-10 sm:w-10 rounded-r-lg hover:bg-accent transition-colors"
                        onClick={handleIncrement}
                        disabled={isUpdating || localQuantity >= maxQuantity || isOutOfStock}
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Increase quantity</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {isUpdating && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Updating...</span>
                </motion.div>
              )}

              {/* Item Total - Mobile */}
              <div className="sm:hidden ml-auto text-right">
                <div className="text-xs text-muted-foreground">Total</div>
                <motion.div 
                  key={itemTotal}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="text-lg font-bold text-foreground"
                >
                  ${itemTotal.toFixed(2)}
                </motion.div>
              </div>
            </div>

            {/* Quantity Error */}
            {quantityError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-2 text-xs sm:text-sm text-destructive flex items-center gap-1"
              >
                <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{quantityError}</span>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRemoveDialog(true)}
                disabled={isRemoving}
                className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                {isRemoving ? (
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                )}
                Remove
              </Button>

              <div className="hidden sm:block w-px h-4 bg-border" />

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddToWishlist}
                      disabled={isUpdating || isInWishlistAlready}
                      className="h-8 hover:text-primary transition-colors"
                    >
                      <Heart 
                        className={cn(
                          "w-3 h-3 sm:w-4 sm:h-4 mr-1 transition-all",
                          isInWishlistAlready && "fill-destructive text-destructive"
                        )} 
                      />
                      {isInWishlistAlready ? 'In Wishlist' : 'Move to Wishlist'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isInWishlistAlready ? 'Already in wishlist' : 'Move to wishlist and remove from cart'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from cart?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{product.name}</strong> from your cart?
              {hasDiscount && savings > 0 && (
                <span className="block mt-2 text-orange-600 dark:text-orange-500 font-medium">
                  You'll lose ${savings.toFixed(2)} in savings.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-destructive hover:bg-destructive/90">
              {isRemoving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
})

CartItem.displayName = 'CartItem'