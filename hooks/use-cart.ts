/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/use-cart.ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'

interface CartItem {
  [x: string]: number
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
    weight?: number
    category: { name: string; id: string } | null
    variants?: Array<{
      id: string
      name: string
      value: string
      priceModifier?: number
    }>
    maxQuantityPerOrder?: number
    minQuantityPerOrder?: number
    isActive?: boolean
  }
  addedAt: string
  savedForLater?: boolean
}

interface CartData {
  items: CartItem[]
  subtotal: number
  totalItems: number
  tax: number
  shipping: number
  discount: number
  total: number
  estimatedDelivery?: string
  freeShippingThreshold?: number
  savedItems?: CartItem[]
}

interface PromoCode {
  code: string
  discount: number
  type: 'percentage' | 'fixed'
  expiresAt?: string
  minPurchase?: number
}

interface WishlistItem {
  id: string
  productId: string
  addedAt: string
}

interface CartNotification {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

interface UseCartOptions {
  autoSync?: boolean
  syncInterval?: number
  enableLocalStorage?: boolean
  enableWishlist?: boolean
  enableSaveForLater?: boolean
  onCartUpdate?: (cart: CartData) => void
  onError?: (error: string) => void
}

export function useCart(options: UseCartOptions = {}) {
  const {
    autoSync = true,
    syncInterval = 30000,
    enableLocalStorage = false,
    enableWishlist = true,
    enableSaveForLater = true,
    onCartUpdate,
    onError
  } = options

  const { data: session, status } = useSession()
  const [cart, setCart] = useState<CartData>({
    items: [],
    subtotal: 0,
    totalItems: 0,
    tax: 0,
    shipping: 0,
    discount: 0,
    total: 0,
    savedItems: []
  })
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null)
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([])
  const [notification, setNotification] = useState<CartNotification | null>(null)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController>(new AbortController())

  // Show notification helper
  const showNotification = useCallback((notif: CartNotification) => {
    setNotification(notif)
    if (notif.duration !== 0) {
      setTimeout(() => setNotification(null), notif.duration || 3000)
    }
  }, [])

  // Fetch wishlist data
  const fetchWishlist = useCallback(async () => {
    if (!enableWishlist || !session?.user) return

    try {
      const response = await fetch('/api/wishlist')
      if (response.ok) {
        const data = await response.json()
        setWishlist(data.items || [])
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error)
    }
  }, [enableWishlist, session?.user])

  

  // Fetch cart from server
  const fetchCart = useCallback(async (silent = false) => {
    if (!session?.user && status !== 'loading') {
      setCart({
        items: [],
        subtotal: 0,
        totalItems: 0,
        tax: 0,
        shipping: 0,
        discount: 0,
        total: 0,
        savedItems: []
      })
      setLoading(false)
      return
    }

    if (status === 'loading') return

    if (!silent) setLoading(true)

    // Cancel previous request
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/cart', {
        signal: abortControllerRef.current.signal
      })
      
      if (response.ok) {
        const data = await response.json()
        setCart(data)
        onCartUpdate?.(data)
        
      } else {
        const error = await response.json()
        onError?.(error.error || 'Failed to fetch cart')
        if (!silent) {
          showNotification({
            type: 'error',
            message: error.error || 'Failed to fetch cart'
          })
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching cart:', error)
        onError?.('Failed to fetch cart')
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [session, status, onCartUpdate, onError, showNotification])

  // Listen for cart updates from other components
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'cart-updated' && session?.user) {
      fetchCart(true)
    }
  }

  const handleCustomEvent = () => {
    if (session?.user) {
      fetchCart(true)
    }
  }

  window.addEventListener('storage', handleStorageChange)
  window.addEventListener('cart-updated', handleCustomEvent)
  
  return () => {
    window.removeEventListener('storage', handleStorageChange)
    window.removeEventListener('cart-updated', handleCustomEvent)
  }
}, [session?.user, fetchCart])

  // Add item to cart with advanced options
  const addToCart = useCallback(async (
    productId: string,
    quantity: number = 1,
    options?: {
      variantId?: string
      showNotification?: boolean
      skipStockCheck?: boolean
    }
  ) => {
    if (!session?.user) {
      showNotification({
        type: 'warning',
        message: 'Please sign in to add items to cart'
      })
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quantity,
          variantId: options?.variantId,
          skipStockCheck: options?.skipStockCheck
        })
      })

      if (response.ok) {
        await fetchCart(true)

          // Trigger update event for other components
          window.dispatchEvent(new Event('cart-updated'))

        if (options?.showNotification !== false) {
          showNotification({
            type: 'success',
            message: 'Item added to cart'
          })
        }
        return { success: true }
      } else {
        const error = await response.json()
        if (options?.showNotification !== false) {
          showNotification({
            type: 'error',
            message: error.error || 'Failed to add item'
          })
        }
        return { success: false, error: error.error }
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
      const errorMsg = 'Failed to add to cart'
      onError?.(errorMsg)
      return { success: false, error: errorMsg }
    }
  }, [session, fetchCart, showNotification, onError])

  // Bulk add items
  const addMultipleToCart = useCallback(async (
    items: Array<{ productId: string; quantity: number; variantId?: string }>
  ) => {
    if (!session?.user) {
      showNotification({
        type: 'warning',
        message: 'Please sign in to add items to cart'
      })
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const response = await fetch('/api/cart/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      })

      if (response.ok) {
        await fetchCart(true)
        showNotification({
          type: 'success',
          message: `${items.length} items added to cart`
        })
        return { success: true }
      } else {
        const error = await response.json()
        showNotification({
          type: 'error',
          message: error.error || 'Failed to add items'
        })
        return { success: false, error: error.error }
      }
    } catch (error) {
      console.error('Error adding multiple items:', error)
      return { success: false, error: 'Failed to add items' }
    }
  }, [session, fetchCart, showNotification])

  // Update quantity with optimistic updates
  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Optimistic update
    const previousCart = { ...cart }
    setCart(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    }))

    try {
      const response = await fetch(`/api/cart/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      })

      if (response.ok) {
        await fetchCart(true)
        return { success: true }
      } else {
        // Revert on error
        setCart(previousCart)
        const error = await response.json()
        showNotification({
          type: 'error',
          message: error.error || 'Failed to update quantity'
        })
        return { success: false, error: error.error }
      }
    } catch (error) {
      setCart(previousCart)
      console.error('Error updating cart:', error)
      return { success: false, error: 'Failed to update cart' }
    }
  }, [session, cart, fetchCart, showNotification])

  // Remove item from cart
  const removeFromCart = useCallback(async (itemId: string, showNotif = true) => {
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' }
    }

    const previousCart = { ...cart }
    setCart(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }))

    try {
      const response = await fetch(`/api/cart/${itemId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchCart(true)
        if (showNotif) {
          showNotification({
            type: 'success',
            message: 'Item removed from cart'
          })
        }
        return { success: true }
      } else {
        setCart(previousCart)
        const error = await response.json()
        if (showNotif) {
          showNotification({
            type: 'error',
            message: error.error || 'Failed to remove item'
          })
        }
        return { success: false, error: error.error }
      }
    } catch (error) {
      setCart(previousCart)
      console.error('Error removing from cart:', error)
      return { success: false }
    }
  }, [session, cart, fetchCart, showNotification])

  // Clear entire cart
  const clearCart = useCallback(async () => {
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const response = await fetch('/api/cart', {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchCart(true)
        showNotification({
          type: 'success',
          message: 'Cart cleared'
        })
        return { success: true }
      } else {
        const error = await response.json()
        showNotification({
          type: 'error',
          message: error.error || 'Failed to clear cart'
        })
        return { success: false, error: error.error }
      }
    } catch (error) {
      console.error('Error clearing cart:', error)
      return { success: false, error: 'Failed to clear cart' }
    }
  }, [session, fetchCart, showNotification])

  // Wishlist operations
  const addToWishlist = useCallback(async (productId: string) => {
    if (!enableWishlist || !session?.user) {
      if (!session?.user) {
        showNotification({
          type: 'warning',
          message: 'Please sign in to add items to wishlist'
        })
      }
      return { success: false, error: 'Not authenticated' }
    }

    // Check if already in wishlist
    const isAlreadyInWishlist = wishlist.some(item => item.productId === productId)
    if (isAlreadyInWishlist) {
      showNotification({
        type: 'info',
        message: 'Product already in wishlist'
      })
      return { success: false, error: 'Already in wishlist' }
    }

    try {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      })

      if (response.ok) {
        await fetchWishlist() // Refresh wishlist
        showNotification({
          type: 'success',
          message: 'Added to wishlist'
        })
        return { success: true }
      } else {
        const error = await response.json()
        showNotification({
          type: 'error',
          message: error.error || 'Failed to add to wishlist'
        })
        return { success: false, error: error.error }
      }
    } catch (error) {
      console.error('Error adding to wishlist:', error)
      return { success: false, error: 'Failed to add to wishlist' }
    }
  }, [enableWishlist, session?.user, wishlist, fetchWishlist, showNotification])

  const removeFromWishlist = useCallback(async (productId: string) => {
    if (!enableWishlist || !session?.user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const response = await fetch(`/api/wishlist/${productId}`, { 
        method: 'DELETE' 
      })
      
      if (response.ok) {
        setWishlist(prev => prev.filter(item => item.productId !== productId))
        showNotification({
          type: 'success',
          message: 'Removed from wishlist'
        })
        return { success: true }
      } else {
        const error = await response.json()
        showNotification({
          type: 'error',
          message: error.error || 'Failed to remove from wishlist'
        })
        return { success: false, error: error.error }
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error)
      return { success: false, error: 'Failed to remove from wishlist' }
    }
  }, [enableWishlist, session?.user, showNotification])

  // Enhanced addToCart with wishlist integration
  const addToCartFromWishlist = useCallback(async (
    productId: string,
    quantity: number = 1,
    removeFromWishlistAfter = false
  ) => {
    const result = await addToCart(productId, quantity, { showNotification: false })
    
    if (result.success && removeFromWishlistAfter && enableWishlist) {
      try {
        await removeFromWishlist(productId)
        showNotification({
          type: 'success',
          message: 'Item added to cart and removed from wishlist'
        })
      } catch (error) {
        console.error('Error removing from wishlist:', error)
        showNotification({
          type: 'success',
          message: 'Item added to cart (failed to remove from wishlist)'
        })
      }
    } else if (result.success) {
      showNotification({
        type: 'success',
        message: 'Item added to cart'
      })
    }
    
    return result
  }, [addToCart, removeFromWishlist, enableWishlist, showNotification])

  // Move wishlist to cart
  const moveWishlistToCart = useCallback(async (productId?: string) => {
    if (!enableWishlist || !session?.user) return { success: false }

    try {
      if (productId) {
        // Move single item
        const result = await addToCartFromWishlist(productId, 1, true)
        return result
      } else {
        // Move all wishlist items
        const response = await fetch('/api/wishlist')
        if (!response.ok) return { success: false }
        
        const wishlistData = await response.json()
        const availableItems = wishlistData.items
          .filter((item: any) => item.product.stock > 0 && item.product.isActive)
          .map((item: any) => ({ productId: item.productId, quantity: 1 }))

        if (availableItems.length === 0) {
          showNotification({
            type: 'warning',
            message: 'No available items in wishlist to add'
          })
          return { success: false }
        }

        const result = await addMultipleToCart(availableItems)
        
        if (result.success) {
          // Clear wishlist after successful cart addition
          await fetch('/api/wishlist', { method: 'DELETE' })
          setWishlist([])
          showNotification({
            type: 'success',
            message: `${availableItems.length} items moved from wishlist to cart`
          })
        }
        
        return result
      }
    } catch (error) {
      console.error('Error moving wishlist to cart:', error)
      return { success: false }
    }
  }, [enableWishlist, session?.user, addToCartFromWishlist, addMultipleToCart, showNotification])

  // Save for later functionality
  const saveForLater = useCallback(async (itemId: string) => {
    if (!enableSaveForLater || !session?.user) {
      return { success: false, error: 'Not available' }
    }

    try {
      const response = await fetch(`/api/cart/${itemId}/save`, {
        method: 'POST'
      })

      if (response.ok) {
        await fetchCart(true)
        showNotification({
          type: 'info',
          message: 'Item saved for later'
        })
        return { success: true }
      } else {
        const error = await response.json()
        showNotification({
          type: 'error',
          message: error.error || 'Failed to save item'
        })
        return { success: false, error: error.error }
      }
    } catch (error) {
      console.error('Error saving for later:', error)
      return { success: false, error: 'Failed to save item' }
    }
  }, [enableSaveForLater, session?.user, fetchCart, showNotification])

  // Move saved item back to cart
  const moveToCart = useCallback(async (itemId: string) => {
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const response = await fetch(`/api/cart/${itemId}/move`, {
        method: 'POST'
      })

      if (response.ok) {
        await fetchCart(true)
        showNotification({
          type: 'success',
          message: 'Item moved to cart'
        })
        return { success: true }
      } else {
        const error = await response.json()
        showNotification({
          type: 'error',
          message: error.error || 'Failed to move item'
        })
        return { success: false, error: error.error }
      }
    } catch (error) {
      console.error('Error moving to cart:', error)
      return { success: false, error: 'Failed to move item' }
    }
  }, [session?.user, fetchCart, showNotification])

  // Promo code operations
  const applyPromoCode = useCallback(async (code: string) => {
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const response = await fetch('/api/cart/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })

      if (response.ok) {
        const data = await response.json()
        setAppliedPromo(data.promo)
        await fetchCart(true)
        showNotification({
          type: 'success',
          message: `Promo code applied: ${data.promo.discount}${data.promo.type === 'percentage' ? '%' : '$'} off`
        })
        return { success: true, promo: data.promo }
      } else {
        const error = await response.json()
        showNotification({
          type: 'error',
          message: error.error || 'Invalid promo code'
        })
        return { success: false, error: error.error }
      }
    } catch (error) {
      console.error('Error applying promo:', error)
      return { success: false, error: 'Failed to apply promo code' }
    }
  }, [session?.user, fetchCart, showNotification])

  const removePromoCode = useCallback(async () => {
    try {
      await fetch('/api/cart/promo', { method: 'DELETE' })
      setAppliedPromo(null)
      await fetchCart(true)
      showNotification({
        type: 'info',
        message: 'Promo code removed'
      })
    } catch (error) {
      console.error('Error removing promo:', error)
    }
  }, [fetchCart, showNotification])

  // Track recently viewed
  const addToRecentlyViewed = useCallback((productId: string) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(id => id !== productId)
      return [productId, ...filtered].slice(0, 10)
    })
  }, [])

  // Estimate shipping
  const estimateShipping = useCallback(async (zipCode: string, country: string = 'US') => {
    try {
      const response = await fetch('/api/cart/shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zipCode, country })
      })

      if (response.ok) {
        const data = await response.json()
        return { success: true, estimate: data }
      }
    } catch (error) {
      console.error('Error estimating shipping:', error)
    }
    return { success: false }
  }, [])

  // Check items availability
  const checkAvailability = useCallback(async () => {
    try {
      const response = await fetch('/api/cart/availability')
      if (response.ok) {
        const data = await response.json()
        if (data.unavailableItems?.length > 0) {
          showNotification({
            type: 'warning',
            message: `${data.unavailableItems.length} item(s) are no longer available`,
            duration: 5000
          })
        }
        return { success: true, data }
      }
    } catch (error) {
      console.error('Error checking availability:', error)
    }
    return { success: false }
  }, [showNotification])

  // Sync cart periodically
  useEffect(() => {
    if (autoSync && session?.user) {
      syncIntervalRef.current = setInterval(() => {
        setSyncing(true)
        fetchCart(true).finally(() => setSyncing(false))
      }, syncInterval)

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current)
        }
      }
    }
  }, [autoSync, session?.user, syncInterval, fetchCart])

  // Initial fetch
  useEffect(() => {
    if (session?.user?.email) {
      fetchCart()
      if (enableWishlist) {
        fetchWishlist()
      }
    }
  }, [session?.user?.email, enableWishlist])

  // Cleanup
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current)
      }
    }
  }, [])

  // Computed properties
  const isEmpty = cart.items.length === 0
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)
  const hasPromoCode = appliedPromo !== null
  const isEligibleForFreeShipping = cart.freeShippingThreshold 
    ? cart.subtotal >= cart.freeShippingThreshold 
    : false
  const freeShippingProgress = cart.freeShippingThreshold
    ? (cart.subtotal / cart.freeShippingThreshold) * 100
    : 0

  return {
    // Cart state
    cart,
    loading,
    syncing,
    isEmpty,
    itemCount,
    
    // Cart operations
    addToCart,
    addMultipleToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    refreshCart: () => fetchCart(),
    
    // Promo codes
    applyPromoCode,
    removePromoCode,
    appliedPromo,
    hasPromoCode,
    
    // Save for later
    saveForLater,
    moveToCart,
    savedItems: cart.savedItems || [],
    
    // Wishlist integration
    wishlist,
    addToWishlist,
    removeFromWishlist,
    addToCartFromWishlist,
    moveWishlistToCart,
    isInWishlist: (productId: string) => wishlist.some(item => item.productId === productId),
    
    // Shipping
    estimateShipping,
    isEligibleForFreeShipping,
    freeShippingProgress,
    
    // Stock & availability
    checkAvailability,
    
    // Recently viewed
    recentlyViewed,
    addToRecentlyViewed,
    
    // Notifications
    notification,
    showNotification,
    clearNotification: () => setNotification(null),
    
    // Utilities
    getItemById: (itemId: string) => cart.items.find(item => item.id === itemId),
    isInCart: (productId: string) => cart.items.some(item => item.product.id === productId),
    getCartItemQuantity: (productId: string) => {
      const item = cart.items.find(item => item.product.id === productId)
      return item?.quantity || 0
    },
    getWishlistItemsInCart: () => {
      return cart.items.filter(cartItem => 
        wishlist.some(wishItem => wishItem.productId === cartItem.product.id)
      )
    },
    getCartItemsInWishlist: () => {
      return wishlist.filter(wishItem =>
        cart.items.some(cartItem => cartItem.product.id === wishItem.productId)
      )
    }
  }
}