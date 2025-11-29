'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Tag, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface Brand {
  id: string
  name: string
  slug: string
  logo: string | null
  _count: {
    products: number
  }
}

// 🔹 Skeleton Loader
const BrandCardSkeleton = () => (
  <div className="flex flex-col items-center text-center animate-pulse min-w-[140px] sm:min-w-[160px]">
    <Skeleton className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full mb-4" />
    <Skeleton className="h-5 w-24 mb-2" />
    <Skeleton className="h-4 w-20 mb-1" />
    <Skeleton className="h-3 w-16" />
  </div>
)

const DealsByBrandSection = () => {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scrollPosition, setScrollPosition] = useState(0)

  // 🔹 Fetch brands on mount
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/brands?sortBy=productsCount&sortOrder=desc&limit=14')
        if (!response.ok) throw new Error('Failed to fetch brands')

        const data = await response.json()
        
        // Filter brands with products and take top brands
        const activeBrands = data.brands.filter((brand: Brand) => brand._count.products > 0)
        setBrands(activeBrands)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        console.error('Error fetching brands:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBrands()
  }, [])

  // 🔹 Scroll handlers for mobile slider
  const handleScroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('brands-slider')
    if (!container) return

    const scrollAmount = 200
    const newPosition = direction === 'left' 
      ? container.scrollLeft - scrollAmount 
      : container.scrollLeft + scrollAmount

    container.scrollTo({ left: newPosition, behavior: 'smooth' })
    setScrollPosition(newPosition)
  }

  // 🔹 Loading State
  if (loading) {
    return (
      <section className="py-14 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <Header />
          {/* Mobile Slider Skeleton */}
          <div className="lg:hidden overflow-hidden">
            <div className="flex gap-6 overflow-x-auto scrollbar-hide">
              {[...Array(7)].map((_, i) => (
                <BrandCardSkeleton key={i} />
              ))}
            </div>
          </div>
          {/* Desktop Grid Skeleton */}
          <div className="hidden lg:grid grid-cols-7 gap-6">
            {[...Array(7)].map((_, i) => (
              <BrandCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  // 🔹 Error or Empty State
  if (error || brands.length === 0) {
    return (
      <section className="py-14 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto text-center py-16">
          <Tag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No brand deals available right now.</p>
        </div>
      </section>
    )
  }

  // 🔹 Rendered Brands
  return (
    <section className="py-14 px-4 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto">
        <Header />
        
        {/* Universal Slider - All Screen Sizes */}
        <div className="relative">
          {/* Navigation Buttons */}
          <button
            onClick={() => handleScroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gray-100/90 hover:Opacity-100 shadow-lg rounded-full p-2 opacity-50 transition-all duration-300"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          
          <button
            onClick={() => handleScroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gray-100/90 hover:Opacity-100 opacity-50 shadow-lg rounded-full p-2 transition-all duration-300"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>

          {/* Scrollable Container */}
          <div
            id="brands-slider"
            className="flex pt-5 gap-6 overflow-x-auto scrollbar-hide scroll-smooth"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {brands.map((brand) => (
              <div key={brand.id} className="min-w-[140px] sm:min-w-[160px] lg:min-w-[180px]">
                <BrandCard brand={brand} />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Grid (>= lg breakpoint) - 7 columns
        <div className="hidden lg:grid lg:grid-cols-6 gap-6">
          {brands.map((brand) => (
            <BrandCard key={brand.id} brand={brand} />
          ))}
        </div> */}
      </div>

      {/* Hide scrollbar CSS */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}

// 🔹 Header Component
const Header = () => (
  <div className="text-start mb-10">
    <h2 className="text-[22px] sm:text-4xl font-semibold text-[#333] mb-1 tracking-tight">
      Deals by Brand
    </h2>
    <p className="text-[#333] text-sm sm:text-base">
      Discover amazing deals from your favorite brands.
    </p>
  </div>
)

// 🔹 Brand Card Component
const BrandCard = ({ brand }: { brand: Brand }) => {
  // Generate random discount for demo (replace with real data from your API)
  const discountPercentage = Math.floor(Math.random() * 50) + 10 // 10-60%
  
  return (
    <Link
      href={`/brands/${brand.slug}`}
      className="group flex flex-col items-center text-center transition-transform duration-300 hover:-translate-y-1"
    >
      {/* Circular Brand Logo with Badge */}
      <div className="relative w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 mb-4">
        {/* Main Circle */}
        <div className="absolute inset-0 rounded-full bg-white border-2 border-gray-200 shadow-md overflow-hidden flex items-center justify-center group-hover:shadow-xl group-hover:border-red-400 transition-all duration-300">
          {brand.logo ? (
            <Image
              src={brand.logo}
              alt={brand.name}
              fill
              className="object-contain object-center p-4 transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 640px) 128px, (max-width: 768px) 144px, 160px"
              priority
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-gray-100 to-gray-200">
              <ShoppingBag className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-gray-400" />
            </div>
          )}
        </div>

        {/* Discount Badge */}
        <div className="absolute -top-1 -right-1 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full w-12 h-12 sm:w-14 sm:h-14 flex flex-col items-center justify-center shadow-lg border-2 border-white group-hover:scale-110 transition-transform duration-300">
          <span className="text-[10px] sm:text-xs font-bold leading-none">UP TO</span>
          <span className="text-sm sm:text-base font-bold leading-none">{discountPercentage}%</span>
        </div>
      </div>

      {/* Brand Name */}
      <h3 className="font-semibold text-[#333] text-sm sm:text-base mb-1 relative">
        <span className="transition-colors duration-300 capitalize">
          {brand.name}
        </span>
        <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-red-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center" />
      </h3>

      {/* Product Count */}
      {brand._count.products > 0 && (
        <p className="text-xs sm:text-sm text-gray-600 font-medium">
          {brand._count.products} {brand._count.products === 1 ? 'product' : 'products'}
        </p>
      )}

      {/* Deal Label */}
      <div className="mt-1 px-3 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-full border border-red-200">
        Hot Deals
      </div>
    </Link>
  )
}

export default DealsByBrandSection