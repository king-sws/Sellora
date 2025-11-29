// components/store/enhanced-wishlist-button.tsx
'use client'

import { useState } from 'react'
import { useWishlist } from '@/hooks/use-wishlist'
import { useCart } from '@/hooks/use-cart'
import { Heart, Loader2, ShoppingCart, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface EnhancedWishlistButtonProps {
  productId: string
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'ghost' | 'outline'
  className?: string
  showText?: boolean
  iconOnly?: boolean
  showCartActions?: boolean
  enableDropdown?: boolean
}

export function EnhancedWishlistButton({ 
  productId, 
  size = 'default',
  variant = 'ghost',
  className,
  showText = true,
  iconOnly = false,
  showCartActions = true,
  enableDropdown = false
}: EnhancedWishlistButtonProps) {
  const { isInWishlist, toggleWishlist } = useWishlist()
  const { addToCartFromWishlist, isInCart, getCartItemQuantity } = useCart()
  const [isLoading, setIsLoading] = useState(false)
  const [actionType, setActionType] = useState<'wishlist' | 'cart' | null>(null)
  
  const isInWishlistState = isInWishlist(productId)
  const isInCartState = isInCart(productId)
  const cartQuantity = getCartItemQuantity(productId)

  const handleWishlistToggle = async () => {
    setIsLoading(true)
    setActionType('wishlist')
    try {
      await toggleWishlist(productId)
    } finally {
      setIsLoading(false)
      setActionType(null)
    }
  }

  const handleAddToCart = async (removeFromWishlist = false) => {
    setIsLoading(true)
    setActionType('cart')
    try {
      await addToCartFromWishlist(productId, 1, removeFromWishlist)
    } finally {
      setIsLoading(false)
      setActionType(null)
    }
  }

  const LoadingIcon = () => (
    <Loader2 className={cn(
      "animate-spin",
      size === 'sm' ? "w-3 h-3" : size === 'lg' ? "w-5 h-5" : "w-4 h-4"
    )} />
  )

  const HeartIcon = () => (
    <Heart className={cn(
      size === 'sm' ? "w-3 h-3" : size === 'lg' ? "w-5 h-5" : "w-4 h-4",
      isInWishlistState && "fill-destructive text-destructive"
    )} />
  )

  const CartIcon = () => (
    <ShoppingCart className={cn(
      size === 'sm' ? "w-3 h-3" : size === 'lg' ? "w-5 h-5" : "w-4 h-4"
    )} />
  )

  if (enableDropdown && showCartActions) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={isLoading}
            className={cn(
              isInWishlistState && variant === 'ghost' && "text-destructive hover:text-destructive",
              className
            )}
          >
            {isLoading && actionType === 'wishlist' ? <LoadingIcon /> : <HeartIcon />}
            {!iconOnly && showText && (
              <span className={cn(size !== 'sm' && "ml-2")}>
                {isInWishlistState ? 'In Wishlist' : 'Add to Wishlist'}
              </span>
            )}
            {enableDropdown && <Plus className={cn(
              "ml-1",
              size === 'sm' ? "w-3 h-3" : "w-4 h-4"
            )} />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleWishlistToggle} disabled={isLoading}>
            {isLoading && actionType === 'wishlist' ? <LoadingIcon /> : <HeartIcon />}
            <span className="ml-2">
              {isInWishlistState ? 'Remove from Wishlist' : 'Add to Wishlist'}
            </span>
          </DropdownMenuItem>
          
          {showCartActions && (
            <>
              <DropdownMenuItem 
                onClick={() => handleAddToCart(false)} 
                disabled={isLoading}
              >
                {isLoading && actionType === 'cart' ? <LoadingIcon /> : <CartIcon />}
                <span className="ml-2">
                  {isInCartState ? `Add More (${cartQuantity} in cart)` : 'Add to Cart'}
                </span>
              </DropdownMenuItem>
              
              {isInWishlistState && (
                <DropdownMenuItem 
                  onClick={() => handleAddToCart(true)}
                  disabled={isLoading}
                >
                  {isLoading && actionType === 'cart' ? <LoadingIcon /> : <CartIcon />}
                  <span className="ml-2">Move to Cart</span>
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  if (iconOnly) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              onClick={handleWishlistToggle}
              disabled={isLoading}
              className={cn(
                "p-2",
                isInWishlistState && variant === 'ghost' && "text-destructive hover:text-destructive",
                className
              )}
            >
              {isLoading ? <LoadingIcon /> : <HeartIcon />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <div>{isInWishlistState ? 'Remove from Wishlist' : 'Add to Wishlist'}</div>
              {isInCartState && (
                <div className="text-xs text-muted-foreground">
                  {cartQuantity} in cart
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={variant}
        size={size}
        onClick={handleWishlistToggle}
        disabled={isLoading && actionType === 'wishlist'}
        className={cn(
          isInWishlistState && variant === 'ghost' && "text-destructive hover:text-destructive",
          className
        )}
      >
        {isLoading && actionType === 'wishlist' ? <LoadingIcon /> : <HeartIcon />}
        {!iconOnly && showText && (
          <span className={cn(!iconOnly && "ml-2")}>
            {isInWishlistState ? 'Remove from Wishlist' : 'Add to Wishlist'}
          </span>
        )}
      </Button>

      {showCartActions && isInWishlistState && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size={size}
                onClick={() => handleAddToCart(true)}
                disabled={isLoading && actionType === 'cart'}
              >
                {isLoading && actionType === 'cart' ? <LoadingIcon /> : <CartIcon />}
                <span className="ml-2">Move to Cart</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Add to cart and remove from wishlist
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}