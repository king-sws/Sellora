/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useWishlist } from '@/hooks/use-wishlist'
import { 
  Package, 
  ShoppingBag, 
  ChevronLeft, 
  ChevronRight,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { EnhancedWishlistButton } from '../store/wishlist-button'

// Minimal Product shape
interface Product {
  id: string
  name: string
  slug: string
  price?: number
  originalPrice?: number
  images?: string[]
  stock?: number
  rating?: number
  reviewCount?: number
  isFeatured?: boolean
}

const ProductCardSkeleton = () => (
  <div className="flex-shrink-0 w-56 sm:w-64 md:w-72 flex flex-col animate-pulse">
    <Skeleton className="w-full h-56 sm:h-64 md:h-72 rounded-2xl mb-4" />
    <Skeleton className="h-5 w-3/4 mb-2" />
    <Skeleton className="h-4 w-1/2 mb-3" />
  </div>
)

export default function ProductCarousel() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawResponse, setRawResponse] = useState<any>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/products?limit=16')
        const data = await res.json()
        console.log('best-sellers response', data)
        setRawResponse((prev:any) => ({ ...prev, bestSellers: data }))

        let items: Product[] = data?.products || []

        if (!Array.isArray(items)) {
          console.warn('products is not an array', items)
          items = []
        }

        setProducts(items)
      } catch (err) {
        console.error('Error fetching products', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400
      const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount)
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      })
    }
  }

  // Loading UI
  if (loading) {
    return (
      <section className="py-14 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="relative">
            <div className="flex gap-6 overflow-hidden">
              <MotivationalCardSkeleton />
              {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Error or empty
  if (error || products.length === 0) {
    return (
      <section className="py-14 px-4 ">
        <div className="max-w-7xl mx-auto text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Package className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-[#333] mb-2">No Best Sellers Found</h3>
          <p className="text-slate-500 mb-6">Check back soon for our most popular products.</p>

          <div className="max-w-3xl mx-auto text-left bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <strong className="text-sm text-[#333]">Debug Information</strong>
            </div>
            <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-600 bg-slate-50 p-4 rounded-lg overflow-auto max-h-64">
              {JSON.stringify(rawResponse, null, 2)}
            </pre>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-14 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Carousel Container */}
        <div className="relative group">
          {/* Left Arrow Button */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-50 shadow-lg rounded-full p-3 transition-all opacity-0 group-hover:opacity-60 disabled:opacity-0 border border-gray-200"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4 text-[#333]" />
          </button>

          {/* Scrollable Products */}
          <div
            ref={scrollContainerRef}
            className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* First Card - Motivational Card */}
            <div className="flex-shrink-0 w-56 sm:w-64 md:w-72">
              <MotivationalCard />
            </div>

            {/* Product Cards */}
            {products.map((product) => (
              <div key={product.id} className="flex-shrink-0 w-56 sm:w-64 md:w-72">
                <ProductCard product={product} />
              </div>
            ))}
          </div>

          {/* Right Arrow Button */}
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-50 shadow-lg rounded-full p-3 transition-all opacity-0 group-hover:opacity-80 disabled:opacity-0 border border-gray-200"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4 text-[#333]" />
          </button>
        </div>
      </div>
    </section>
  )
}

const MotivationalCardSkeleton = () => (
  <div className="flex-shrink-0 w-56 sm:w-64 md:w-72 animate-pulse">
    <div className="h-[400px] sm:h-[448px] md:h-[496px] bg-gray-200 rounded-2xl" />
  </div>
)

const MotivationalCard = () => (
  <div className="h-full min-h-[400px] sm:min-h-[448px] md:min-h-[420px] bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] rounded-2xl p-8 flex flex-col justify-between shadow-lg">
    <div className="flex-1 flex flex-col justify-center">
      <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
        Today&#39;s Deals
      </h2>
      <p className="text-lg text-gray-200 mb-8">
        All With Free Shipping
      </p>
      
      <Link href="/products">
        <Button 
          size="lg"
          className="bg-white hover:bg-gray-100 text-[#1a1a1a] px-8 py-6 text-base font-semibold rounded-full shadow-md hover:shadow-lg transition-all w-fit"
        >
          Shop now
        </Button>
      </Link>
    </div>
  </div>
)

const ProductCard = ({ product }: { product: Product }) => {
  const { data: session } = useSession()
  const router = useRouter()
  // const [imageStyle, setImageStyle] = useState<'cover' | 'contain'>('cover')

  const img = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null
  const fullImg = img && !img.startsWith('http') ? `${process.env.NEXT_PUBLIC_SITE_URL || ''}${img}` : img

    // Check if product is likely a TV/monitor based on name
  const isTVProduct = () => {
    const name = product.name.toLowerCase()
    const tvKeywords = ['tv', 'television','s25', 'smart tv']
    return tvKeywords.some(keyword => name.includes(keyword))
  }
  
  const [imageStyle, setImageStyle] = useState<'cover' | 'contain'>(
    isTVProduct() ? 'contain' : 'cover'
  )

  // Detect if image has transparency/no background
const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
  // Only run detection if not already set to contain by TV detection
    if (isTVProduct()) return

  const img = e.currentTarget
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  if (!ctx) return

  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  
  // Check aspect ratio first - portrait images (like TVs) should use contain
  const aspectRatio = canvas.width / canvas.height
  const isPortrait = aspectRatio < 0.9 // Image is taller than it is wide
  
  // For portrait/vertical products, always use contain
  if (isPortrait) {
    setImageStyle('contain')
    return
  }
  
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
    console.log('Could not analyze image, using cover')
    setImageStyle('cover')
  }
}

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm overflow-hidden transition-shadow hover:shadow-lg border border-gray-200">
      {/* Image Container */}
      <Link 
        href={`/products/${product.slug}`} 
        className="relative w-full h-56 sm:h-64 md:h-72 bg-white overflow-hidden block group/card"
      >
        {fullImg ? (
          <Image 
            src={fullImg} 
            alt={product.name} 
            fill 
            className={`group-hover/card:scale-105 transition-transform duration-500 ${
              imageStyle === 'contain' ? 'object-contain p-4' : 'object-cover'
            }`}
            sizes="(max-width: 640px) 224px, (max-width: 768px) 256px, 288px"
            onLoad={handleImageLoad}
            crossOrigin="anonymous"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <ShoppingBag className="w-16 h-16 text-gray-300" />
          </div>
        )}

        {/* Enhanced Wishlist Button */}
        <div 
          className="absolute top-4 right-4 z-10"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!session) {
              router.push(`/auth/sign-in?redirect=/product/${product.slug}`)
            }
          }}
        >
          <EnhancedWishlistButton
            productId={product.id}
            size="default"
            variant="ghost"
            iconOnly={true}
            showCartActions={false}
            className="w-10 h-10 rounded-full bg-white/90 shadow-md hover:shadow-lg hover:scale-110 transition-all border border-gray-200"
          />
        </div>
      </Link>

      {/* Content Container */}
      <Link href={`/products/${product.slug}`} className="flex flex-col flex-grow p-5 bg-white border-t border-gray-100">
        {/* Product Name */}
        <h3 className="font-semibold text-[#333] text-base mb-3 line-clamp-2 min-h-[3rem] leading-snug">
          {product.name}
        </h3>

        {/* Price */}
        <div className="mt-auto">
          {typeof product.price === 'number' ? (
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-[#333]">
                ${product.price.toFixed(2)}
              </p>
              {product.originalPrice && product.originalPrice > product.price && (
                <p className="text-base text-gray-400 line-through">
                  ${product.originalPrice.toFixed(2)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Price N/A</p>
          )}
        </div>
      </Link>
    </div>
  )
}