/* eslint-disable react/no-unescaped-entities */
// components/store/enhanced-search-bar.tsx
'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  X, 
  TrendingUp, 
  Clock, 
  Loader2, 
  Tag, 
  Star,
  Package,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

// =========================================================
// TYPES & INTERFACES
// =========================================================

interface SearchResult {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  images: string[]
  category: string | null
  brand: string | null
  stock: number
  rating: number | null
  reviewCount: number
  isFeatured: boolean
  tags: string[]
}

interface SearchResponse {
  results: SearchResult[]
  query: string
  count: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters?: Record<string, any>
}

interface SearchBarProps {
  className?: string
  placeholder?: string
  showPopular?: boolean
  autoFocus?: boolean
  onSearchComplete?: (query: string, results: SearchResult[]) => void
}

interface RecentSearch {
  query: string
  timestamp: number
}

// =========================================================
// CONSTANTS
// =========================================================

const DEBOUNCE_DELAY = 300
const MAX_RECENT_SEARCHES = 5
const RESULTS_LIMIT = 6
const RECENT_SEARCHES_KEY = 'search_recent'

// Popular categories - These should ideally come from an API
const POPULAR_CATEGORIES = [
  { label: 'Electronics', slug: 'electronics', icon: '📱' },
  { label: 'Fashion', slug: 'fashion', icon: '👕' },
  { label: 'Home & Garden', slug: 'home-garden', icon: '🏡' },
  { label: 'Sports & Outdoors', slug: 'sports', icon: '⚽' },
  { label: 'Books', slug: 'books', icon: '📚' },
  { label: 'Toys & Games', slug: 'toys', icon: '🎮' },
]

// =========================================================
// UTILITY FUNCTIONS
// =========================================================

/**
 * Load recent searches from localStorage
 */
function loadRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
    if (!stored) return []
    
    const parsed: RecentSearch[] = JSON.parse(stored)
    
    // Filter out searches older than 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
    const recent = parsed
      .filter(s => s.timestamp > thirtyDaysAgo)
      .sort((a, b) => b.timestamp - a.timestamp)
      .map(s => s.query)
    
    return recent.slice(0, MAX_RECENT_SEARCHES)
  } catch (error) {
    console.error('Error loading recent searches:', error)
    return []
  }
}

/**
 * Save recent searches to localStorage
 */
function saveRecentSearches(searches: string[]): void {
  if (typeof window === 'undefined') return
  
  try {
    const searchObjects: RecentSearch[] = searches.map(query => ({
      query,
      timestamp: Date.now()
    }))
    
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searchObjects))
  } catch (error) {
    console.error('Error saving recent searches:', error)
  }
}

/**
 * Highlight matching text in search results
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  
  const regex = new RegExp(`(${query})`, 'gi')
  const parts = text.split(regex)
  
  return parts.map((part, i) => 
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 text-gray-900 font-medium">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

/**
 * Format price with currency
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price)
}

// =========================================================
// MAIN COMPONENT
// =========================================================

export function EnhancedSearchBar({ 
  className, 
  placeholder = "Search products, brands, categories...",
  showPopular = true,
  autoFocus = false,
  onSearchComplete
}: SearchBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  
  // Refs
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(loadRecentSearches())
  }, [])
  
  // Auto-focus if needed
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])
  
  // Sync with URL search param
  useEffect(() => {
    const urlQuery = searchParams.get('search')
    if (urlQuery && urlQuery !== query) {
      setQuery(urlQuery)
    }
  }, [searchParams])
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Debounced search with abort controller
  useEffect(() => {
    const trimmedQuery = query.trim()
    
    if (!trimmedQuery) {
      setResults([])
      setError(null)
      setHighlightedIndex(-1)
      return
    }
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    setIsLoading(true)
    setError(null)
    
    const timer = setTimeout(async () => {
      // Create new abort controller
      abortControllerRef.current = new AbortController()
      
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmedQuery)}&limit=${RESULTS_LIMIT}`,
          { signal: abortControllerRef.current.signal }
        )
        
        if (!response.ok) {
          throw new Error('Search failed')
        }
        
        const data: SearchResponse = await response.json()
        setResults(data.results || [])
        setError(null)
        
        if (onSearchComplete) {
          onSearchComplete(trimmedQuery, data.results || [])
        }
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            // Request was aborted, ignore
            return
          }
          setError('Failed to search. Please try again.')
        }
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, DEBOUNCE_DELAY)
    
    return () => {
      clearTimeout(timer)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [query, onSearchComplete])
  
  // Add search to recent searches
  const addToRecentSearches = useCallback((searchTerm: string) => {
    const trimmed = searchTerm.trim()
    if (!trimmed) return
    
    setRecentSearches(prev => {
      // Remove duplicate and add to front
      const filtered = prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase())
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES)
      
      // Persist to localStorage
      saveRecentSearches(updated)
      
      return updated
    })
  }, [])
  
  // Handle search submission
  const handleSearch = useCallback((searchTerm: string) => {
    const trimmed = searchTerm.trim()
    if (!trimmed) return
    
    addToRecentSearches(trimmed)
    setIsOpen(false)
    setQuery('')
    setHighlightedIndex(-1)
    
    router.push(`/products?search=${encodeURIComponent(trimmed)}`)
  }, [router, addToRecentSearches])
  
  // Handle category navigation
  const handleCategoryClick = useCallback((categorySlug: string, categoryLabel: string) => {
    addToRecentSearches(categoryLabel)
    setIsOpen(false)
    setQuery('')
    setHighlightedIndex(-1)
    
    router.push(`/products?category=${categorySlug}`)
  }, [router, addToRecentSearches])
  
  // Handle product navigation
  const handleProductClick = useCallback((product: SearchResult) => {
    addToRecentSearches(query)
    setIsOpen(false)
    setQuery('')
    setHighlightedIndex(-1)
    
    router.push(`/products/${product.slug}`)
  }, [router, query, addToRecentSearches])
  
  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    
    // If there's a highlighted result, navigate to it
    if (highlightedIndex >= 0 && results[highlightedIndex]) {
      handleProductClick(results[highlightedIndex])
    } else {
      handleSearch(query)
    }
  }, [query, highlightedIndex, results, handleSearch, handleProductClick])
  
  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return
    
    switch (e.key) {
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        inputRef.current?.blur()
        break
        
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        )
        break
        
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
        
      case 'Enter':
        if (highlightedIndex >= 0 && results[highlightedIndex]) {
          e.preventDefault()
          handleProductClick(results[highlightedIndex])
        }
        break
    }
  }, [isOpen, highlightedIndex, results, handleProductClick])
  
  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }, [])
  
  // Remove recent search
  const removeRecentSearch = useCallback((searchTerm: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    setRecentSearches(prev => {
      const updated = prev.filter(s => s !== searchTerm)
      saveRecentSearches(updated)
      return updated
    })
  }, [])
  
  // Clear all recent searches
  const clearAllRecentSearches = useCallback(() => {
    setRecentSearches([])
    saveRecentSearches([])
  }, [])
  
  // Determine what to show in dropdown
  const showResults = !isLoading && query && results.length > 0
  const showNoResults = !isLoading && query && results.length === 0 && !error
  const showRecentSearches = !query && recentSearches.length > 0
  const showPopularCategories = !query && showPopular
  
  return (
    <div ref={searchRef} className={cn("relative w-full max-w-2xl", className)}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className="pl-11 pr-10 h-12 rounded-lg border-2 focus:border-primary transition-colors"
            autoComplete="off"
            aria-label="Search products"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            aria-controls="search-results"
          />
          
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          
          {query && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md p-0 hover:bg-gray-100"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>

      {/* Search Dropdown */}
      {isOpen && (
        <div 
          id="search-results"
          className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-200 max-h-[32rem] overflow-y-auto z-50"
          role="listbox"
        >
          {/* Loading State */}
          {isLoading && (
            <div className="p-6 flex items-center justify-center text-sm text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Searching...
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-6 flex items-center justify-center text-sm text-red-500">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          )}

          {/* Search Results */}
          {showResults && (
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 px-3 py-2 uppercase tracking-wide">
                Products ({results.length})
              </div>
              
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleProductClick(result)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                    highlightedIndex === index 
                      ? "bg-blue-50 border border-blue-200" 
                      : "hover:bg-gray-50 border border-transparent"
                  )}
                  role="option"
                  aria-selected={highlightedIndex === index}
                >
                  {/* Product Image */}
                  <div className="relative w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                    {result.images[0] ? (
                      <Image
                        src={result.images[0]}
                        alt={result.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    
                    {result.isFeatured && (
                      <Badge className="absolute top-1 right-1 text-[10px] px-1 py-0 h-4 bg-yellow-500">
                        ⭐
                      </Badge>
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate mb-1">
                      {highlightMatch(result.name, query)}
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Price */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-base font-semibold text-primary">
                          {formatPrice(result.price)}
                        </span>
                        {result.comparePrice && result.comparePrice > result.price && (
                          <span className="text-xs text-gray-400 line-through">
                            {formatPrice(result.comparePrice)}
                          </span>
                        )}
                      </div>
                      
                      {/* Rating */}
                      {result.rating && result.rating > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span>{result.rating.toFixed(1)}</span>
                          <span className="text-gray-400">({result.reviewCount})</span>
                        </div>
                      )}
                      
                      {/* Stock Status */}
                      {result.stock === 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                          Out of Stock
                        </Badge>
                      )}
                      {result.stock > 0 && result.stock <= 5 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          Only {result.stock} left
                        </Badge>
                      )}
                    </div>
                    
                    {/* Category & Brand */}
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      {result.category && <span>{result.category}</span>}
                      {result.category && result.brand && <span>•</span>}
                      {result.brand && <span className="font-medium">{result.brand}</span>}
                    </div>
                  </div>
                </button>
              ))}
              
              {/* View All Results */}
              <button
                onClick={() => handleSearch(query)}
                className="w-full mt-2 p-3 text-sm text-primary hover:bg-blue-50 rounded-lg transition-colors text-center font-semibold border border-primary/20"
              >
                View all results for "{query}"
              </button>
            </div>
          )}

          {/* No Results */}
          {showNoResults && (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-1">
                No products found
              </p>
              <p className="text-xs text-gray-500">
                Try adjusting your search or browse our categories
              </p>
            </div>
          )}

          {/* Recent Searches */}
          {showRecentSearches && (
            <div className="p-2 border-b">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 uppercase tracking-wide">
                  <Clock className="w-3.5 h-3.5" />
                  Recent Searches
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearAllRecentSearches}
                  className="h-6 text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear all
                </Button>
              </div>
              
              {recentSearches.map((search, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg group transition-colors"
                >
                  <button
                    onClick={() => handleSearch(search)}
                    className="flex-1 text-left text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    {search}
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => removeRecentSearch(search, e)}
                    className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 rounded-md transition-opacity"
                    aria-label={`Remove ${search} from recent searches`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Popular Categories */}
          {showPopularCategories && (
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 px-3 py-2 flex items-center gap-1.5 uppercase tracking-wide">
                <TrendingUp className="w-3.5 h-3.5" />
                Popular Categories
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {POPULAR_CATEGORIES.map((category) => (
                  <button
                    key={category.slug}
                    onClick={() => handleCategoryClick(category.slug, category.label)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 rounded-lg transition-colors border border-gray-100 hover:border-gray-200"
                  >
                    <span className="text-lg">{category.icon}</span>
                    <span className="font-medium text-gray-700">{category.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}