// app/(dashboard)/account/wishlist/page.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useWishlist } from '@/hooks/use-wishlist'
import { useCart } from '@/hooks/use-cart'
import { 
  Heart, 
  ShoppingCart, 
  Trash2,
  AlertCircle,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface SmartImageProps {
  src: string
  alt: string
  productName: string
}
function SmartProductImage({ src, alt, productName }: SmartImageProps) {
  const [imageStyle, setImageStyle] = useState<'cover' | 'contain'>('cover')

  // Check if product is likely a TV/monitor/phone based on name
  const isVerticalProduct = useCallback(() => {
    const name = productName.toLowerCase()
    const keywords = ['tv']
    return keywords.some(keyword => name.includes(keyword))
  }, [productName])

  // Detect if image has transparency or no background
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    // If already identified as vertical product, keep contain
    if (isVerticalProduct()) {
      setImageStyle('contain')
      return
    }

    const img = e.currentTarget
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return

    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    
    // Check aspect ratio - portrait images should use contain
    const aspectRatio = canvas.width / canvas.height
    const isPortrait = aspectRatio < 0.9
    
    if (isPortrait) {
      setImageStyle('contain')
      return
    }
    
    try {
      ctx.drawImage(img, 0, 0)
      
      // Sample points to check for transparency or white background
      const checkPoints = [
        { x: 0, y: 0 }, // top-left
        { x: canvas.width - 1, y: 0 }, // top-right
        { x: 0, y: canvas.height - 1 }, // bottom-left
        { x: canvas.width - 1, y: canvas.height - 1 }, // bottom-right
        { x: Math.floor(canvas.width / 2), y: 0 }, // top-center
        { x: 0, y: Math.floor(canvas.height / 2) }, // left-center
      ]

      let hasTransparency = false
      let pureWhiteCorners = 0

      for (const point of checkPoints) {
        const pixel = ctx.getImageData(point.x, point.y, 1, 1).data
        
        // Check for transparency
        if (pixel[3] < 255) {
          hasTransparency = true
          break
        }
        
        // Check for pure white or near-white
        if (pixel[0] > 250 && pixel[1] > 250 && pixel[2] > 250) {
          pureWhiteCorners++
        }
      }

      // If image has transparency or mostly white corners, use contain
      if (hasTransparency || pureWhiteCorners >= 4) {
        setImageStyle('contain')
      } else {
        setImageStyle('cover')
      }
    } catch (err) {
      // CORS or other error - fallback to cover
      setImageStyle('cover')
    }
  }, [isVerticalProduct])

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={`group-hover:scale-105 transition-transform duration-300 ${
        imageStyle === 'contain' ? 'object-contain p-4' : 'object-cover'
      }`}
      onLoad={handleImageLoad}
      crossOrigin="anonymous"
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
    />
  )
}

// Skeleton Components
function WishlistItemSkeleton() {
  return (
    <div className="group bg-white border border-gray-200 rounded-lg overflow-hidden animate-pulse">
      <div className="relative aspect-square bg-gray-200" />
      <div className="p-4">
        <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
        <div className="h-3 bg-gray-200 rounded mb-3 w-1/2" />
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-gray-200 rounded w-20" />
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-10 bg-gray-200 rounded-lg" />
          <div className="w-10 h-10 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

function WishlistSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {[...Array(6)].map((_, i) => (
        <WishlistItemSkeleton key={i} />
      ))}
    </div>
  )
}

// Toast Component
function ToastContainer({ toasts, removeToast }: { toasts: Toast[], removeToast: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 p-4 rounded-lg shadow-lg border backdrop-blur-sm animate-in slide-in-from-right ${
            toast.type === 'success'
              ? 'bg-green-50/95 border-green-200 text-green-800'
              : toast.type === 'error'
              ? 'bg-red-50/95 border-red-200 text-red-800'
              : 'bg-blue-50/95 border-blue-200 text-blue-800'
          }`}
        >
          {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />}
          {toast.type === 'info' && <Heart className="h-5 w-5 text-blue-600 flex-shrink-0" />}
          <p className="text-sm font-medium flex-1">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-current opacity-50 hover:opacity-100 transition-opacity"
            aria-label="Close notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

// Clear Wishlist Modal
function ClearWishlistModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemCount,
  isClearing 
}: { 
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  itemCount: number
  isClearing: boolean
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Clear Wishlist?
            </h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to remove all {itemCount} {itemCount === 1 ? 'item' : 'items'} from your wishlist? This action cannot be undone.
            </p>
          </div>
        </div>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isClearing}
            className="px-4 py-2.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isClearing}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isClearing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Clearing...</span>
              </>
            ) : (
              'Clear Wishlist'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WishlistPage() {
  const { data: session, status } = useSession()
  const [toasts, setToasts] = useState<Toast[]>([])
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const [showClearModal, setShowClearModal] = useState(false)
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set())
  const [isClearing, setIsClearing] = useState(false)
  
  const {
    wishlist,
    loading: wishlistLoading,
    isEmpty: wishlistEmpty,
    removeFromWishlist,
    clearWishlist,
    refreshWishlist,
    goToPage,
    nextPage,
    prevPage,
    pagination
  } = useWishlist({
    autoFetch: true,
    pageSize: 12
  })

  const {
    addToCartFromWishlist
  } = useCart()

  // Memoized values
  const itemCount = useMemo(() => pagination.totalCount, [pagination.totalCount])
  const hasItems = useMemo(() => !wishlistEmpty && itemCount > 0, [wishlistEmpty, itemCount])

  // Toast management with auto-dismiss
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  // Add to cart with optimistic updates
// Add to cart with optimistic updates - FIXED VERSION
const handleAddToCart = useCallback(async (productId: string, productName: string) => {
  const loadingKey = `cart-${productId}`
  setLoadingStates(prev => ({ ...prev, [loadingKey]: true }))
  
  try {
    // Use addToCartFromWishlist with removeFromWishlist = true
    const result = await addToCartFromWishlist(productId, 1, true)
    if (result.success) {
      showToast(`${productName} added to cart and removed from wishlist!`, 'success')
      
      // ✅ CRITICAL FIX: Refresh wishlist to reflect the changes
      await refreshWishlist()
    } else {
      showToast(result.error || 'Failed to add item to cart', 'error')
    }
  } catch (error) {
    console.error('Error adding to cart:', error)
    showToast('An error occurred while adding to cart', 'error')
  } finally {
    setLoadingStates(prev => {
      const newState = { ...prev }
      delete newState[loadingKey]
      return newState
    })
  }
}, [addToCartFromWishlist, showToast, refreshWishlist]) // Added refreshWishlist to dependencies

  // Remove from wishlist with optimistic UI update
  const handleRemoveFromWishlist = useCallback(async (productId: string, productName: string) => {
    const loadingKey = `remove-${productId}`
    
    // Add to deleting set for UI feedback
    setDeletingItems(prev => new Set(prev).add(productId))
    setLoadingStates(prev => ({ ...prev, [loadingKey]: true }))
    
    try {
      const result = await removeFromWishlist(productId, false) // Don't show hook notification
      if (result.success) {
        showToast(`${productName} removed from wishlist`, 'info')
      } else {
        showToast(result.error || 'Failed to remove item', 'error')
        // Remove from deleting set if failed
        setDeletingItems(prev => {
          const newSet = new Set(prev)
          newSet.delete(productId)
          return newSet
        })
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error)
      showToast('An error occurred while removing item', 'error')
      setDeletingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(productId)
        return newSet
      })
    } finally {
      setLoadingStates(prev => {
        const newState = { ...prev }
        delete newState[loadingKey]
        return newState
      })
      // Remove from deleting set after animation
      setTimeout(() => {
        setDeletingItems(prev => {
          const newSet = new Set(prev)
          newSet.delete(productId)
          return newSet
        })
      }, 300)
    }
  }, [removeFromWishlist, showToast])

  // Clear wishlist with confirmation
  const handleClearWishlist = useCallback(async () => {
    setIsClearing(true)
    
    try {
      const result = await clearWishlist()
      if (result.success) {
        showToast(`All ${itemCount} ${itemCount === 1 ? 'item' : 'items'} removed from wishlist`, 'info')
        setShowClearModal(false)
      } else {
        showToast(result.error || 'Failed to clear wishlist', 'error')
      }
    } catch (error) {
      console.error('Error clearing wishlist:', error)
      showToast('An error occurred while clearing wishlist', 'error')
    } finally {
      setIsClearing(false)
    }
  }, [clearWishlist, itemCount, showToast])

  // Format price with sale indication
  const formatPrice = useCallback((price: number, salePrice?: number) => {
    if (salePrice && salePrice < price) {
      const discount = Math.round(((price - salePrice) / price) * 100)
      return (
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-900">${salePrice.toFixed(2)}</span>
          <span className="text-sm text-gray-400 line-through">${price.toFixed(2)}</span>
          <span className="text-xs text-red-600 font-medium">-{discount}%</span>
        </div>
      )
    }
    return <span className="text-lg font-semibold text-gray-900">${price.toFixed(2)}</span>
  }, [])

  // Pagination handlers
  const handlePrevPage = useCallback(() => {
    if (pagination.hasPrev && !wishlistLoading) {
      prevPage()
    }
  }, [pagination.hasPrev, wishlistLoading, prevPage])

  const handleNextPage = useCallback(() => {
    if (pagination.hasNext && !wishlistLoading) {
      nextPage()
    }
  }, [pagination.hasNext, wishlistLoading, nextPage])

  // Refetch wishlist when session changes
  useEffect(() => {
    if (session?.user && refreshWishlist) {
      refreshWishlist()
    }
  }, [session?.user?.email]) // Only depend on email to avoid infinite loops

  // Loading state for authentication - Show skeleton
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="h-10 bg-gray-200 rounded w-48 animate-pulse" />
              <div className="h-10 bg-gray-200 rounded w-24 animate-pulse" />
            </div>
            <div className="h-5 bg-gray-200 rounded w-32 animate-pulse" />
          </div>
          
          {/* Grid Skeleton */}
          <WishlistSkeleton />
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!session) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Sign in required</h1>
          <p className="text-gray-500 text-sm mb-6">
            Please sign in to view and manage your wishlist.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/signin">
              <button className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors">
                Sign In
              </button>
            </Link>
            <Link href="/products">
              <button className="px-6 py-2.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 text-sm font-medium rounded-lg transition-colors">
                Browse Products
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Clear Wishlist Modal */}
      <ClearWishlistModal 
        isOpen={showClearModal}
        onClose={() => !isClearing && setShowClearModal(false)}
        onConfirm={handleClearWishlist}
        itemCount={itemCount}
        isClearing={isClearing}
      />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl lg:text-4xl font-semibold text-gray-900">Wishlist</h1>
            {hasItems && !wishlistLoading && (
              <Button
                onClick={() => setShowClearModal(true)}
                disabled={isClearing}
                variant={'ghost'}
              >
                {isClearing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Clear all</span>
                  </>
                )}
              </Button>
            )}
          </div>
          <p className="text-gray-500">
            {wishlistLoading ? (
              <span className="inline-block w-20 h-4 bg-gray-200 rounded animate-pulse" />
            ) : (
              `${itemCount} ${itemCount === 1 ? 'item' : 'items'} saved`
            )}
          </p>
        </div>

        {/* Content */}
        {wishlistLoading ? (
          <WishlistSkeleton />
        ) : wishlistEmpty ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Heart className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Your wishlist is empty</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
              Save items you love to your wishlist and come back to them later.
            </p>
            <Link href="/products">
              <button className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors">
                Start Shopping
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* Wishlist Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {wishlist.items.map((item) => {
                const isDeleting = deletingItems.has(item.productId)
                const isAddingToCart = loadingStates[`cart-${item.productId}`]
                const isRemoving = loadingStates[`remove-${item.productId}`]
                
                return (
                  <div 
                    key={item.id} 
                    className={`group bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-200" ${
                      isDeleting ? 'opacity-50 scale-95' : ''
                    }`}
                  >
                    {/* Product Image */}
                    <Link href={`/products/${item.product.slug}`} className="block relative aspect-square bg-white">
                      <SmartProductImage
                        src={item.product.images[0] || '/placeholder.png'}
                        alt={item.product.name}
                        productName={item.product.name}
                      />
                      {item.product.salePrice && item.product.salePrice < item.product.price && (
                        <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">
                          Sale
                        </div>
                      )}
                      {item.product.stock === 0 && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <span className="bg-white text-gray-900 text-sm font-semibold px-4 py-2 rounded-lg">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </Link>

                    {/* Product Info */}
                    <div className="p-4 border-t border-gray-100">
                      <Link 
                        href={`/products/${item.product.slug}`}
                        className="block mb-2"
                      >
                        <h3 className="font-medium text-gray-900 line-clamp-2 hover:text-gray-600 transition-colors">
                          {item.product.name}
                        </h3>
                      </Link>
                      
                      {item.product.category && (
                        <p className="text-xs text-gray-500 mb-3">
                          {item.product.category.name}
                        </p>
                      )}

                      <div className="flex items-center justify-between mb-4">
                        {formatPrice(item.product.price, item.product.salePrice)}
                        {item.product.stock > 0 ? (
                          <span className="text-xs text-green-600 font-medium">
                            {item.product.stock < 10 ? `Only ${item.product.stock} left` : 'In Stock'}
                          </span>
                        ) : (
                          <span className="text-xs text-red-600 font-medium">Out of Stock</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAddToCart(item.product.id, item.product.name)}
                          disabled={item.product.stock === 0 || isAddingToCart || isDeleting}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all"
                        >
                          {isAddingToCart ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Adding...</span>
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="h-4 w-4" />
                              <span>Add to Cart</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleRemoveFromWishlist(item.productId, item.product.name)}
                          disabled={isRemoving || isDeleting}
                          className="p-2.5 border border-gray-300 hover:border-red-300 hover:bg-red-50 rounded-lg transition-colors group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Remove from wishlist"
                        >
                          {isRemoving ? (
                            <Loader2 className="h-4 w-4 text-gray-600 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-gray-600 group-hover/btn:text-red-600" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={!pagination.hasPrev || wishlistLoading}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
                <span className="text-sm text-gray-600 px-4">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={!pagination.hasNext || wishlistLoading}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}