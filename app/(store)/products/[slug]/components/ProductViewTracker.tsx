'use client'

import { useProductView } from '@/hooks/useProductView'

interface ProductViewTrackerProps {
  productId: string
}

export function ProductViewTracker({ productId }: ProductViewTrackerProps) {
  useProductView(productId)
  return null // This component doesn't render anything
}