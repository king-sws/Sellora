
// components/store/wishlist-page.tsx
'use client'

import { useState } from 'react'
import { useWishlist } from '@/hooks/use-wishlist'
import { useCart } from '@/hooks/use-cart'
import { WishlistItem } from './wishlist-item'
import { Heart, ShoppingCart, Trash2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export function WishlistPage() {
  const {
    wishlist,
    loading,
    isEmpty,
    itemCount,
    totalCount,
    pagination,
    removeMultipleFromWishlist,
    clearWishlist,
    nextPage,
    prevPage,
    goToPage,
    notification,
    clearNotification
  } = useWishlist()

  const { addMultipleToCart } = useCart()

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSelectAll = () => {
    if (selectedItems.size === wishlist.items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(wishlist.items.map(item => item.productId)))
    }
  }

  const handleSelectItem = (productId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedItems(newSelected)
  }

  const handleAddSelectedToCart = async () => {
    if (selectedItems.size === 0) return

    setIsProcessing(true)
    try {
      const availableItems = wishlist.items
        .filter(item => 
          selectedItems.has(item.productId) && 
          item.product.stock > 0 && 
          item.product.isActive
        )
        .map(item => item.productId)

      if (availableItems.length > 0) {
        await addMultipleToCart(availableItems.map(id => ({ productId: id, quantity: 1 })))
        setSelectedItems(new Set())
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemoveSelected = async () => {
    if (selectedItems.size === 0) return

    setIsProcessing(true)
    try {
      await removeMultipleFromWishlist(Array.from(selectedItems))
      setSelectedItems(new Set())
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClearWishlist = async () => {
    setIsProcessing(true)
    try {
      await clearWishlist()
      setSelectedItems(new Set())
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Heart className="w-8 h-8 text-destructive" />
            My Wishlist
          </h1>
          <p className="text-muted-foreground mt-1">
            {totalCount} {totalCount === 1 ? 'item' : 'items'} saved
          </p>
        </div>

        {!isEmpty && (
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Wishlist</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove all items from your wishlist? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleClearWishlist}
                    disabled={isProcessing}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div className={cn(
          "mb-6 p-4 rounded-lg border",
          notification.type === 'success' && "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200",
          notification.type === 'error' && "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200",
          notification.type === 'warning' && "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200",
          notification.type === 'info' && "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200"
        )}>
          <div className="flex justify-between items-center">
            <span>{notification.message}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearNotification}
              className="text-current hover:bg-black/5 dark:hover:bg-white/5"
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {isEmpty ? (
        <Card className="text-center py-12">
          <CardContent>
            <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Your wishlist is empty</h2>
            <p className="text-muted-foreground mb-6">
              Save items you love to buy them later
            </p>
            <Button asChild>
              <Link href="/products">Continue Shopping</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Bulk Actions */}
          {wishlist.items.length > 1 && (
            <Card className="mb-6">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedItems.size === wishlist.items.length}
                      onCheckedChange={handleSelectAll}
                      disabled={isProcessing}
                    />
                    <span className="text-sm font-medium">
                      {selectedItems.size === 0 ? 'Select all' : `${selectedItems.size} selected`}
                    </span>
                  </div>

                  {selectedItems.size > 0 && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleAddSelectedToCart}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <ShoppingCart className="w-4 h-4 mr-2" />
                        )}
                        Add to Cart ({selectedItems.size})
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRemoveSelected}
                        disabled={isProcessing}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove ({selectedItems.size})
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Wishlist Items */}
          <div className="space-y-4 mb-8">
            {wishlist.items.map((item) => (
              <div key={item.id} className="relative">
                {wishlist.items.length > 1 && (
                  <div className="absolute top-4 left-4 z-10">
                    <Checkbox
                      checked={selectedItems.has(item.productId)}
                      onCheckedChange={() => handleSelectItem(item.productId)}
                      disabled={isProcessing}
                      className="bg-white dark:bg-gray-900 border-2"
                    />
                  </div>
                )}
                <WishlistItem 
                  item={item}
                />
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, totalCount)} of{' '}
                    {totalCount} items
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={prevPage}
                      disabled={!pagination.hasPrev || loading}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(
                          pagination.page - 2 + i,
                          pagination.totalPages - 4 + i
                        ))
                        
                        if (pageNum < 1 || pageNum > pagination.totalPages) return null

                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === pagination.page ? "default" : "ghost"}
                            size="sm"
                            onClick={() => goToPage(pageNum)}
                            disabled={loading}
                            className="w-10"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={nextPage}
                      disabled={!pagination.hasNext || loading}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}