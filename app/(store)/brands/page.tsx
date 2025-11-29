// app/(store)/brands/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Building2, Package, Globe, AlertCircle, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react'

interface Brand {
  id: string
  name: string
  slug: string
  logo: string | null
  description: string | null
  website: string | null
  _count: {
    products: number
  }
}

const BrandCardSkeleton = () => (
  <div className="min-w-[140px] sm:min-w-[160px] animate-pulse">
    <div className="flex flex-col items-center text-center">
      <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full bg-gray-200 mb-4" />
      <div className="h-5 w-24 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-16 bg-gray-200 rounded" />
    </div>
  </div>
)

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchBrands()
  }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = brands.filter(brand =>
        brand.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredBrands(filtered)
    } else {
      setFilteredBrands(brands)
    }
  }, [searchQuery, brands])

  const fetchBrands = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/brands?sortBy=name&sortOrder=asc')
      
      if (!response.ok) throw new Error('Failed to fetch brands')
      
      const data = await response.json()
      // Only show brands with products
      const activeBrands = data.brands.filter((brand: Brand) => 
        brand._count.products > 0
      )
      setBrands(activeBrands)
      setFilteredBrands(activeBrands)
    } catch (error) {
      console.error('Error fetching brands:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group brands alphabetically
  const groupedBrands = filteredBrands.reduce((acc, brand) => {
    const firstLetter = brand.name[0].toUpperCase()
    if (!acc[firstLetter]) {
      acc[firstLetter] = []
    }
    acc[firstLetter].push(brand)
    return acc
  }, {} as Record<string, Brand[]>)

  const alphabet = Object.keys(groupedBrands).sort()

  const handleScroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('brands-slider')
    if (!container) return

    const scrollAmount = 200
    const newPosition = direction === 'left' 
      ? container.scrollLeft - scrollAmount 
      : container.scrollLeft + scrollAmount

    container.scrollTo({ left: newPosition, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header Section */}
      <div className="py-14 px-4 border-b border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="text-start">
              <h1 className="text-[22px] sm:text-4xl font-semibold text-[#333] mb-1 tracking-tight">
                Explore Our Brands
              </h1>
              <p className="text-[#333] text-sm sm:text-base">
                Discover products from the world&lsquo;s leading brands
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all duration-300 shadow-sm hover:shadow-md group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Back to Store
            </Link>
          </div>
          
          {/* Search Bar */}
          <div className="max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-base bg-white text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-7 py-12">
        {/* Stats */}
        {!loading && brands.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-12">
            <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-3xl font-bold text-[#333] mb-1">
                {brands.length}
              </div>
              <p className="text-gray-600 text-sm">Total Brands</p>
            </div>
            
            <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-3xl font-bold text-[#333] mb-1">
                {brands.reduce((sum, b) => sum + b._count.products, 0)}
              </div>
              <p className="text-gray-600 text-sm">Total Products</p>
            </div>
            
            <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-3xl font-bold text-[#333] mb-1">
                {searchQuery ? filteredBrands.length : brands.length}
              </div>
              <p className="text-gray-600 text-sm">
                {searchQuery ? 'Search Results' : 'Available Now'}
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <>
            {/* Mobile Slider Skeleton */}
            <div className="lg:hidden relative">
              <div
                id="brands-slider"
                className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {[...Array(7)].map((_, i) => (
                  <BrandCardSkeleton key={i} />
                ))}
              </div>
            </div>
            
            {/* Desktop Grid Skeleton */}
            <div className="hidden lg:grid lg:grid-cols-7 gap-6">
              {[...Array(7)].map((_, i) => (
                <BrandCardSkeleton key={i} />
              ))}
            </div>
          </>
        ) : filteredBrands.length > 0 ? (
          <>
            {/* Alphabet Navigation */}
            {!searchQuery && alphabet.length > 1 && (
              <div className="mb-8 flex flex-wrap gap-2 justify-center">
                {alphabet.map(letter => (
                  <a
                    key={letter}
                    href={`#letter-${letter}`}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:border-[#333] hover:bg-gray-50 transition-all font-semibold text-[#333]"
                  >
                    {letter}
                  </a>
                ))}
              </div>
            )}

            {/* Brands Display */}
            <div className="space-y-12">
              {alphabet.map(letter => (
                <div key={letter} id={`letter-${letter}`}>
                  {!searchQuery && (
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-full bg-[#333] flex items-center justify-center text-white text-2xl font-bold">
                        {letter}
                      </div>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  )}
                  
                  {/* Mobile: Horizontal Scroll */}
                  <div className="lg:hidden relative">
                    <button
                      onClick={() => handleScroll('left')}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 transition-all"
                      aria-label="Scroll left"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-700" />
                    </button>
                    
                    <button
                      onClick={() => handleScroll('right')}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 transition-all"
                      aria-label="Scroll right"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-700" />
                    </button>

                    <div
                      id="brands-slider"
                      className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth"
                      style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                      }}
                    >
                      {groupedBrands[letter].map(brand => (
                        <div key={brand.id} className="min-w-[140px] sm:min-w-[160px]">
                          <BrandCard brand={brand} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Desktop: Grid */}
                  <div className="hidden lg:grid lg:grid-cols-7 gap-6">
                    {groupedBrands[letter].map(brand => (
                      <BrandCard key={brand.id} brand={brand} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#333] mb-2">
              No brands found
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? `No brands match "${searchQuery}"`
                : 'No brands available at the moment'
              }
            </p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="px-6 py-2 border border-gray-300 rounded-lg text-[#333] hover:bg-gray-50 transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}

// Brand Card Component
function BrandCard({ brand }: { brand: Brand }) {
  return (
    <Link
      href={`/brands/${brand.slug}`}
      className="group flex flex-col items-center text-center transition-transform duration-300 hover:-translate-y-1"
    >
      {/* Circular Image */}
      <div className="relative w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 mb-4 rounded-full bg-white border border-gray-200 shadow-sm overflow-hidden flex items-center justify-center group-hover:shadow-md transition-all duration-300">
        {brand.logo ? (
          <Image
            src={brand.logo}
            alt={brand.name}
            fill
            className="object-contain p-4"
            sizes="(max-width: 640px) 128px, (max-width: 768px) 144px, 160px"
          />
        ) : (
          <Building2 className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-gray-400" />
        )}
      </div>

      {/* Brand Name */}
      <h3 className="font-semibold text-[#333] text-sm sm:text-base mb-1 relative capitalize">
        <span className="transition-colors duration-300">
          {brand.name}
        </span>
        <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-[#333] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center" />
      </h3>

      {/* Product Count */}
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Package className="w-3 h-3" />
        <span>{brand._count.products} {brand._count.products === 1 ? 'product' : 'products'}</span>
      </div>

      {/* Website Link - Only show on hover/desktop */}
      {brand.website && (
        <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:block">
          <div className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#333]">
            <Globe className="w-3 h-3" />
            <span>Visit Website</span>
          </div>
        </div>
      )}
    </Link>
  )
}