/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/use-wishlist.ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'

interface WishlistItem {
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

interface WishlistData {
  items: WishlistItem[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

interface WishlistNotification {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

interface UseWishlistOptions {
  autoFetch?: boolean
  initialPage?: number
  pageSize?: number
  onWishlistUpdate?: (wishlist: WishlistData) => void
  onError?: (error: string) => void
}

export function useWishlist(options: UseWishlistOptions = {}) {
  const {
    autoFetch = true,
    initialPage = 1,
    pageSize = 20,
    onWishlistUpdate,
    onError
  } = options

  const { data: session, status } = useSession()
  const [wishlist, setWishlist] = useState<WishlistData>({
    items: [],
    pagination: {
      page: 1,
      limit: pageSize,
      totalCount: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    }
  })
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<WishlistNotification | null>(null)
  const abortControllerRef = useRef<AbortController>(new AbortController())

  // Show notification helper
  const showNotification = useCallback((notif: WishlistNotification) => {
    setNotification(notif)
    if (notif.duration !== 0) {
      setTimeout(() => setNotification(null), notif.duration || 3000)
    }
  }, [])

  // Fetch wishlist from server
  const fetchWishlist = useCallback(async (page = 1, silent = false) => {
    if (!session?.user && status !== 'loading') {
      setWishlist({
        items: [],
        pagination: {
          page: 1,
          limit: pageSize,
          totalCount: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
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
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString()
      })

      const response = await fetch(`/api/wishlist?${params}`, {
        signal: abortControllerRef.current.signal
      })
      
      if (response.ok) {
        const data = await response.json()
        setWishlist(data)
        onWishlistUpdate?.(data)
      } else {
        const error = await response.json()
        onError?.(error.error || 'Failed to fetch wishlist')
        showNotification({
          type: 'error',
          message: error.error || 'Failed to fetch wishlist'
        })
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error fetching wishlist:', error)
        onError?.('Failed to fetch wishlist')
        showNotification({
          type: 'error',
          message: 'Failed to fetch wishlist'
        })
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [session, status, pageSize, onWishlistUpdate, onError, showNotification])

  // Add item to wishlist
  const addToWishlist = useCallback(async (
    productId: string,
    showNotif = true
  ) => {
    if (!session?.user) {
      showNotification({
        type: 'warning',
        message: 'Please sign in to add items to wishlist'
      })
      return { success: false, error: 'Not authenticated' }
    }

    // Optimistic update
    const isAlreadyInWishlist = wishlist.items.some(item => item.productId === productId)
    if (isAlreadyInWishlist) {
      if (showNotif) {
        showNotification({
          type: 'info',
          message: 'Product already in wishlist'
        })
      }
      return { success: false, error: 'Already in wishlist' }
    }

    try {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      })

      if (response.ok) {
        await fetchWishlist(wishlist.pagination.page, true)
        if (showNotif) {
          showNotification({
            type: 'success',
            message: 'Added to wishlist'
          })
        }
        return { success: true }
      } else {
        const error = await response.json()
        if (showNotif) {
          showNotification({
            type: 'error',
            message: error.error || 'Failed to add to wishlist'
          })
        }
        return { success: false, error: error.error }
      }
    } catch (error) {
      console.error('Error adding to wishlist:', error)
      const errorMsg = 'Failed to add to wishlist'
      onError?.(errorMsg)
      if (showNotif) {
        showNotification({
          type: 'error',
          message: errorMsg
        })
      }
      return { success: false, error: errorMsg }
    }
  }, [session, wishlist, fetchWishlist, onError, showNotification])

  // Remove item from wishlist
  const removeFromWishlist = useCallback(async (
    productId: string,
    showNotif = true
  ) => {
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Optimistic update
    const previousWishlist = { ...wishlist }
    setWishlist(prev => ({
      ...prev,
      items: prev.items.filter(item => item.productId !== productId),
      pagination: {
        ...prev.pagination,
        totalCount: Math.max(0, prev.pagination.totalCount - 1)
      }
    }))

    try {
      const response = await fetch(`/api/wishlist/${productId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        if (showNotif) {
          showNotification({
            type: 'success',
            message: 'Removed from wishlist'
          })
        }
        // Refresh to get accurate pagination
        await fetchWishlist(wishlist.pagination.page, true)
        return { success: true }
      } else {
        // Revert optimistic update
        setWishlist(previousWishlist)
        const error = await response.json()
        if (showNotif) {
          showNotification({
            type: 'error',
            message: error.error || 'Failed to remove from wishlist'
          })
        }
        return { success: false, error: error.error }
      }
    } catch (error) {
      // Revert optimistic update
      setWishlist(previousWishlist)
      console.error('Error removing from wishlist:', error)
      const errorMsg = 'Failed to remove from wishlist'
      if (showNotif) {
        showNotification({
          type: 'error',
          message: errorMsg
        })
      }
      return { success: false, error: errorMsg }
    }
  }, [session, wishlist, fetchWishlist, showNotification])

  // Toggle item in wishlist (add if not present, remove if present)
  const toggleWishlist = useCallback(async (productId: string) => {
    const isInWishlist = wishlist.items.some(item => item.productId === productId)
    
    if (isInWishlist) {
      return await removeFromWishlist(productId)
    } else {
      return await addToWishlist(productId)
    }
  }, [wishlist.items, addToWishlist, removeFromWishlist])

  // Add multiple items to wishlist
  const addMultipleToWishlist = useCallback(async (productIds: string[]) => {
    if (!session?.user) {
      showNotification({
        type: 'warning',
        message: 'Please sign in to add items to wishlist'
      })
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const response = await fetch('/api/wishlist/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })

      if (response.ok) {
        const data = await response.json()
        await fetchWishlist(1, true) // Go to first page to see new items
        showNotification({
          type: 'success',
          message: data.message
        })
        return { success: true, addedCount: data.addedCount }
      } else {
        const error = await response.json()
        showNotification({
          type: 'error',
          message: error.error || 'Failed to add items to wishlist'
        })
        return { success: false, error: error.error }
      }
    } catch (error) {
      console.error('Error adding multiple items to wishlist:', error)
      return { success: false, error: 'Failed to add items to wishlist' }
    }
  }, [session, fetchWishlist, showNotification])

  // Remove multiple items from wishlist
  const removeMultipleFromWishlist = useCallback(async (productIds: string[]) => {
    try {
      const response = await fetch('/api/wishlist/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds })
      })

      if (response.ok) {
        const data = await response.json()
        await fetchWishlist(wishlist.pagination.page, true)
        showNotification({
          type: 'success',
          message: data.message
        })
        return { success: true, removedCount: data.removedCount }
      } else {
        const error = await response.json()
        showNotification({
          type: 'error',
          message: error.error || 'Failed to remove items'
        })
        return { success: false, error: error.error }
      }
    } catch (error) {
      console.error('Error removing multiple items:', error)
      return { success: false, error: 'Failed to remove items' }
    }
  }, [wishlist.pagination.page, fetchWishlist, showNotification])

  // Clear entire wishlist
  const clearWishlist = useCallback(async () => {
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' }
    }

    try {
      const response = await fetch('/api/wishlist', {
        method: 'DELETE'
      })

      if (response.ok) {
        setWishlist({
          items: [],
          pagination: {
            page: 1,
            limit: pageSize,
            totalCount: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        })
        showNotification({
          type: 'success',
          message: 'Wishlist cleared'
        })
        return { success: true }
      } else {
        const error = await response.json()
        showNotification({
          type: 'error',
          message: error.error || 'Failed to clear wishlist'
        })
        return { success: false, error: error.error }
      }
    } catch (error) {
      console.error('Error clearing wishlist:', error)
      return { success: false, error: 'Failed to clear wishlist' }
    }
  }, [session, pageSize, showNotification])

  // Navigate to different pages
  const goToPage = useCallback(async (page: number) => {
    if (page < 1 || page > wishlist.pagination.totalPages) {
      return
    }
    await fetchWishlist(page)
  }, [wishlist.pagination.totalPages, fetchWishlist])

  const nextPage = useCallback(async () => {
    if (wishlist.pagination.hasNext) {
      await goToPage(wishlist.pagination.page + 1)
    }
  }, [wishlist.pagination, goToPage])

  const prevPage = useCallback(async () => {
    if (wishlist.pagination.hasPrev) {
      await goToPage(wishlist.pagination.page - 1)
    }
  }, [wishlist.pagination, goToPage])

  // Initial fetch
  useEffect(() => {
    if (autoFetch && session?.user?.email) {
      fetchWishlist(initialPage)
    }
  }, [session?.user?.email, autoFetch, fetchWishlist, initialPage])

  // Cleanup
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  // Computed properties
  const isEmpty = wishlist.items.length === 0
  const itemCount = wishlist.items.length
  const totalCount = wishlist.pagination.totalCount

  // Check if product is in wishlist
  const isInWishlist = useCallback((productId: string): boolean => {
    return wishlist.items.some(item => item.productId === productId)
  }, [wishlist.items])

  // Get wishlist item by product ID
  const getWishlistItem = useCallback((productId: string): WishlistItem | undefined => {
    return wishlist.items.find(item => item.productId === productId)
  }, [wishlist.items])

  // Get available products (in stock)
  const getAvailableItems = useCallback((): WishlistItem[] => {
    return wishlist.items.filter(item => item.product.stock > 0 && item.product.isActive)
  }, [wishlist.items])

  return {
    // Wishlist state
    wishlist,
    loading,
    isEmpty,
    itemCount,
    totalCount,
    
    // Wishlist operations
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    clearWishlist,
    refreshWishlist: () => fetchWishlist(wishlist.pagination.page),
    
    // Bulk operations
    addMultipleToWishlist,
    removeMultipleFromWishlist,
    
    // Pagination
    pagination: wishlist.pagination,
    goToPage,
    nextPage,
    prevPage,
    
    // Utilities
    isInWishlist,
    getWishlistItem,
    getAvailableItems,
    
    // Notifications
    notification,
    showNotification,
    clearNotification: () => setNotification(null)
  }
}