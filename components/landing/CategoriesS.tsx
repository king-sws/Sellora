/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Package, ShoppingBag, ChevronDown } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

// Minimal Product shape
interface Product {
  id: string
  name: string
  slug: string
  price?: number
  images?: string[]
}

const ProductCardSkeleton = () => (
  <div className="flex flex-col items-center text-center animate-pulse">
    <Skeleton className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full mb-4" />
    <Skeleton className="h-5 w-24 mb-2" />
    <Skeleton className="h-3 w-16" />
  </div>
)

export default function BestSellersWithFallback() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawResponse, setRawResponse] = useState<any>(null)
  const [showAll, setShowAll] = useState(false)

  const INITIAL_DISPLAY = 5

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        // 1) Try best-sellers endpoint first
        const res = await fetch('/api/products/best-sellers?limit=10')
        const data = await res.json()
        console.log('best-sellers response', data)
        setRawResponse((prev:any) => ({ ...prev, bestSellers: data }))

        let items: Product[] = data?.products || []


        // Normalize items
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

  // Loading UI
  if (loading) {
    return (
      <section className="py-14 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <Header />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {Array.from({ length: 5 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        </div>
      </section>
    )
  }

  // Error or empty
  if (error || products.length === 0) {
    return (
      <section className="py-14 px-4 bg-white">
        <div className="max-w-7xl mx-auto text-center py-16">
          <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">No best sellers found right now.</p>

          <div className="max-w-3xl mx-auto text-left bg-gray-50 border border-gray-100 p-4 rounded-md text-xs text-gray-700">
            <strong>Debug (API responses)</strong>
            <pre className="mt-2 whitespace-pre-wrap break-words text-xs">{JSON.stringify(rawResponse, null, 2)}</pre>
          </div>
        </div>
      </section>
    )
  }

  const displayedProducts = showAll ? products : products.slice(0, INITIAL_DISPLAY)
  const hasMore = products.length > INITIAL_DISPLAY

  return (
    <section className="py-14 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <Header />
        
        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {displayedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Show More Button */}
        {hasMore && !showAll && (
          <div className="flex justify-center mt-10">
            <button
              onClick={() => setShowAll(true)}
              className="group flex items-center gap-2 px-6 py-3 bg-[#333] hover:bg-[#444] text-white font-medium rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
            >
              <span>Show More Products</span>
              <ChevronDown className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
            </button>
          </div>
        )}

        {/* Show Less Button */}
        {showAll && (
          <div className="flex justify-center mt-10">
            <button
              onClick={() => setShowAll(false)}
              className="group flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-[#333] font-medium rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
            >
              <span>Show Less</span>
              <ChevronDown className="w-5 h-5 rotate-180 group-hover:-translate-y-1 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

const Header = () => (
  <div className="text-start mb-10">
    <h2 className="text-[22px] sm:text-4xl font-semibold text-[#333] mb-1 tracking-tight">Best Sellers</h2>
    <p className="text-[#555] text-sm sm:text-base">Discover the most popular products loved by our customers.</p>
  </div>
)

const ProductCard = ({ product }: { product: Product }) => {
  // Check if product is a TV - compute once at component initialization
  const isTVProduct = (() => {
    const name = product.name.toLowerCase()
    const tvKeywords = ['tv', 'television', 's25', 'smart tv', 's10']
    return tvKeywords.some(keyword => name.includes(keyword))
  })()
  
  const [imageStyle, setImageStyle] = useState<'cover' | 'contain'>(
    isTVProduct ? 'contain' : 'cover'
  )

  const img = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null
  const fullImg = img && !img.startsWith('http') ? `${process.env.NEXT_PUBLIC_SITE_URL || ''}${img}` : img

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
    <Link href={`/products/${product.slug}`} className="group flex flex-col items-center text-center transition-transform duration-300 hover:-translate-y-1">
      <div className="relative w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 mb-4 rounded-lg bg-white border border-gray-200 shadow-md overflow-hidden flex items-center justify-center">
        {fullImg ? (
          <Image 
            src={fullImg} 
            alt={product.name} 
            fill 
            className={`rounded-lg ${
              imageStyle === 'contain' ? 'object-contain p-3' : 'object-cover object-center'
            }`}
            sizes="128px" 
            priority 
            onLoad={handleImageLoad}
            crossOrigin="anonymous"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-gray-100 to-gray-200">
            <ShoppingBag className="w-12 h-12 text-gray-400" />
          </div>
        )}
      </div>

      <h3 className="font-semibold text-[#333] text-sm sm:text-base mb-1 truncate w-full">{product.name}</h3>
      {typeof product.price === 'number' ? <p className="text-xs text-gray-500">${product.price.toFixed(2)}</p> : <p className="text-xs text-gray-400">Price N/A</p>}
    </Link>
  )
}