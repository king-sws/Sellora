'use client'

import { useEffect } from 'react'

interface RecentlyViewedItem {
  productId: string
  viewedAt: number
}

export function useProductView(productId: string | undefined) {
  useEffect(() => {
    if (!productId) return

    const addToRecentlyViewed = () => {
      try {
        const recentlyViewedStr = localStorage.getItem('recentlyViewed')
        let recentlyViewed: RecentlyViewedItem[] = recentlyViewedStr 
          ? JSON.parse(recentlyViewedStr) 
          : []

        // Remove existing entry if present
        recentlyViewed = recentlyViewed.filter(item => item.productId !== productId)

        // Add to beginning
        recentlyViewed.unshift({
          productId,
          viewedAt: Date.now()
        })

        // Keep only last 50 items
        recentlyViewed = recentlyViewed.slice(0, 50)

        localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed))
      } catch (error) {
        console.error('Error saving recently viewed:', error)
      }
    }

    addToRecentlyViewed()
  }, [productId])
}