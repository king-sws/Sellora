'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { EnhancedWishlistButton } from '../store/wishlist-button'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice?: number
  images: string[]
  category?: {
    name: string
    slug: string
  }
  averageRating?: number
  reviewCount?: number
  stock: number
}

interface RecentlyViewedItem {
  productId: string
  viewedAt: number
}

export default function RecentlyViewedSection() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecentlyViewed()
  }, [])

  const loadRecentlyViewed = async () => {
    try {
      let recentlyViewedStr = null
      
      // Try to access localStorage
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          recentlyViewedStr = localStorage.getItem('recentlyViewed')
        }
      } catch (e) {
        console.error('localStorage not accessible:', e)
      }

      if (!recentlyViewedStr) {
        setLoading(false)
        return
      }

      const recentlyViewed: RecentlyViewedItem[] = JSON.parse(recentlyViewedStr)
      
      if (recentlyViewed.length === 0) {
        setLoading(false)
        return
      }

      // Get the last 12 viewed products
      const productIds = recentlyViewed
        .sort((a, b) => b.viewedAt - a.viewedAt)
        .slice(0, 12)
        .map(item => item.productId)

      // Fetch product details
      try {
        const response = await fetch(`/api/products?ids=${productIds.join(',')}&limit=12`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch products')
        }

        const data = await response.json()
        
        // Sort products by view order
        const sortedProducts = productIds
          .map(id => data.products.find((p: Product) => p.id === id))
          .filter(Boolean)
        
        setProducts(sortedProducts)
      } catch (apiError) {
        console.error('API fetch error:', apiError)
      }
    } catch (error) {
      console.error('Error loading recently viewed:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearRecentlyViewed = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('recentlyViewed')
        setProducts([])
      }
    } catch (e) {
      console.error('Error clearing recently viewed:', e)
    }
  }

  if (loading) {
    return (
      <section className="py-8 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="h-8 w-64 bg-gray-200 animate-pulse rounded"></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg overflow-hidden border border-gray-200">
                <div className="aspect-square bg-gray-200 animate-pulse"></div>
                <div className="p-3">
                  <div className="h-4 bg-gray-200 animate-pulse rounded mb-2"></div>
                  <div className="h-5 bg-gray-200 animate-pulse rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (products.length === 0) {
    return null
  }

  return (
    <section className="py-8 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[22px] sm:text-4xl font-semibold text-[#333] mb-1 tracking-tight">
            Your Recently Viewed Items
          </h2>
          {/* <button
            onClick={clearRecentlyViewed}
            className="group flex items-center justify-center gap-2 whitespace-nowrap rounded-md border text-sm transition-all border-border-subtle bg-white dark:bg-black text-content-emphasis hover:bg-bg-muted focus-visible:border-border-emphasis outline-none data-[state=open]:border-border-emphasis data-[state=open]:ring-4 data-[state=open]:ring-border-subtle h-8 px-2"
          >
            <p className='min-w-0 truncate'>Clear All</p>
          </button> */}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ProductCard({ product }: { product: Product }) {
  const { data: session } = useSession()
  const router = useRouter()
  
  // Check if product is a TV - compute once at component initialization
  const isTVProduct = (() => {
    const name = product.name.toLowerCase()
    const tvKeywords = ['tv', 'television', 's25', 's10']
    return tvKeywords.some(keyword => name.includes(keyword))
  })()
  
  const [imageStyle, setImageStyle] = useState<'cover' | 'contain'>(
    isTVProduct ? 'contain' : 'cover'
  )

  // Detect if image has transparency/no background
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
      
      // Check corners and edges for transparency or pure white
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
        
        // Check for pure white or near-white (common in product photos without background)
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
      // If CORS error, default to cover (safer for images with backgrounds)
      console.log('Could not analyze image, using cover')
      setImageStyle('cover')
    }
  }

  return (
    <div className="group bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-200">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-white">
          <Image
            src={product.images[0] || '/placeholder.png'}
            alt={product.name}
            fill
            className={`group-hover:scale-105 transition-transform duration-300 ${
              imageStyle === 'contain' ? 'object-contain p-3' : 'object-cover'
            }`}
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
            onLoad={handleImageLoad}
            crossOrigin="anonymous"
          />
          
          {/* Enhanced Wishlist Button */}
          <div 
            className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (!session) {
                router.push(`/auth/sign-in?redirect=/products/${product.slug}`)
              }
            }}
          >
            <EnhancedWishlistButton
              productId={product.id}
              size="default"
              variant="ghost"
              iconOnly={true}
              showCartActions={false}
              className="w-9 h-9 rounded-full bg-white/90 shadow-md hover:shadow-lg hover:scale-110 transition-all border border-gray-200"
            />
          </div>
        </div>

        <div className="p-3 border-t border-gray-100">
          <h3 className="font-medium text-sm text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </h3>

          <div className="text-lg font-bold text-gray-900">
            ${product.price.toFixed(2)}
          </div>
        </div>
      </Link>
    </div>
  )
}