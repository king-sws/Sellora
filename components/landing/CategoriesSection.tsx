'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Package, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface Category {
  id: string
  name: string
  slug: string
  image: string | null
  _count: {
    products: number
    children: number
  }
  children?: Category[]
}

// 🔹 Skeleton Loader (for shimmer while loading)
const CategoryCardSkeleton = () => (
  <div className="flex flex-col items-center text-center animate-pulse min-w-[140px] sm:min-w-[160px]">
    <Skeleton className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full mb-4" />
    <Skeleton className="h-5 w-24 mb-2" />
    <Skeleton className="h-3 w-16" />
  </div>
)

const CategoriesSection = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scrollPosition, setScrollPosition] = useState(0)

  // 🔹 Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/categories?onlyParents=true&includeChildren=true')
        if (!response.ok) throw new Error('Failed to fetch categories')

        const data = await response.json()
        
        const electronics = data.find(
          (cat: Category) =>
            cat.name.toLowerCase() === 'electronics' ||
            cat.slug.toLowerCase().includes('electronic')
        )

        let fetchedCategories = electronics?.children?.length ? electronics.children : data
        
        // 🔹 Sorting
        const categoryOrder = ['Laptops', 'Smartphones', 'Gaming', 'Tablets', 'Headphones', 'Tv', 'Cameras']
        fetchedCategories = fetchedCategories.sort((a: { name: string }, b: { name: string }) => {
          const indexA = categoryOrder.indexOf(a.name)
          const indexB = categoryOrder.indexOf(b.name)
          if (indexA === -1) return 1
          if (indexB === -1) return -1
          return indexA - indexB
        })

        setCategories(fetchedCategories)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        console.error('Error fetching categories:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  // 🔹 Scroll handlers for mobile slider
  const handleScroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('categories-slider')
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
      <section className="pb-10 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <Header />
          {/* Mobile Slider Skeleton */}
          <div className="lg:hidden overflow-hidden">
            <div className="flex gap-6 overflow-x-auto scrollbar-hide">
              {[...Array(7)].map((_, i) => (
                <CategoryCardSkeleton key={i} />
              ))}
            </div>
          </div>
          {/* Desktop Grid Skeleton */}
          <div className="hidden lg:grid grid-cols-7 gap-6">
            {[...Array(7)].map((_, i) => (
              <CategoryCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  // 🔹 Error or Empty State
  if (error || categories.length === 0) {
    return (
      <section className="py-14 px-4 bg-white">
        <div className="max-w-7xl mx-auto text-center py-16">
          <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No categories available right now.</p>
        </div>
      </section>
    )
  }

  // 🔹 Rendered Categories
  return (
    <section className="py-14 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <Header />
        
        {/* Mobile/Tablet Slider (< lg breakpoint) */}
        <div className="lg:hidden relative">
          {/* Navigation Buttons */}
          <button
            onClick={() => handleScroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 transition-all duration-300"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4 text-gray-700" />
          </button>
          
          <button
            onClick={() => handleScroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 transition-all duration-300"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4 text-gray-700" />
          </button>

          {/* Scrollable Container */}
          <div
            id="categories-slider"
            className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth "
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {categories.map((category) => (
              <div key={category.id} className="min-w-[140px] sm:min-w-[160px]">
                <CategoryCard category={category} />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Grid (>= lg breakpoint) - 7 columns */}
        <div className="hidden lg:grid lg:grid-cols-7 gap-6">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
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

// 🔹 Header Component (clean & elegant)
const Header = () => (
  <div className="text-start mb-10">
    <h2 className="text-[22px] sm:text-4xl font-semibold text-[#333] mb-1 tracking-tight">
      The future in your hands
    </h2>
    <p className="text-[#333] text-sm sm:text-base">
      Explore the latest innovations and devices built for you.
    </p>
  </div>
)

// 🔹 Category Card (main visual component)
const CategoryCard = ({ category }: { category: Category }) => {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group flex flex-col items-center text-center transition-transform duration-300 hover:-translate-y-1"
    >
      {/* Circular Image */}
      <div className="relative w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 mb-4 rounded-full bg-white border border-gray-200 shadow-md overflow-hidden flex items-center justify-center group-hover:shadow-lg transition-all duration-300">
        {category.image ? (
          <Image
            src={category.image}
            alt={category.name}
            fill
            className="object-cover object-center rounded-full transition-transform duration-500"
            sizes="(max-width: 640px) 128px, (max-width: 768px) 144px, 160px"
            priority
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-gray-100 to-gray-200">
            <ShoppingBag className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-gray-400" />
          </div>
        )}
      </div>

      {/* Category Name */}
      <h3 className="font-semibold text-[#333] text-sm sm:text-base mb-1 relative">
        <span className="transition-colors duration-300 capitalize">
          {category.name}
        </span>
        <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-[#333] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center" />
      </h3>
    </Link>
  )
}

export default CategoriesSection