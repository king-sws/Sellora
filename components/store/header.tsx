/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
'use client'

import * as React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/hooks/use-cart'
import { cn } from '@/lib/utils'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ShoppingCart,
  Search,
  Menu,
  User,
  Package,
  Heart,
  Settings,
  LogOut,
  Shield,
  Megaphone,
  X,
  Shirt,
  Laptop,
  Home,
  Dumbbell,
  BookOpen,
  Tag,
  ChevronDown,
  PackageSearch,
  Clock,
  Loader2,
  TrendingUp,
  ChevronRight,
} from 'lucide-react'

// Types
interface HeaderProps {
  className?: string
  session?: any
}

interface NavItem {
  title: string
  href: string
  icon?: React.ElementType
}

interface CategoryWithSubs {
  title: string
  href: string
  icon: React.ElementType
  image?: string
  subcategories: { title: string; href: string; image?: string }[]
}

interface SearchResult {
  id: string
  name: string
  slug: string
  price: number
  images: string[]
  category?: string
}

// Main navigation categories - Desktop top bar
const mainCategories: NavItem[] = [
  { title: 'Electronics', href: '/categories/electronics' },
  { title: 'Fashion', href: '/categories/fashion' },
  { title: 'Home & Garden', href: '/categories/home' },
  { title: 'Sports', href: '/categories/sports' },
  { title: 'Books', href: '/categories/books' },
]

// Categories with subcategories for mega menu dropdown
const categoriesWithSubs: CategoryWithSubs[] = [
  {
    title: 'Electronics',
    href: '/categories/electronics',
    icon: Laptop,
    image: '/elect.png',
    subcategories: [
      { title: 'Smartphones', href: '/categories/electronics/smartphones', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&h=150&fit=crop' },
      { title: 'Laptops', href: '/categories/electronics/laptops', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&h=150&fit=crop' },
      { title: 'Tablets', href: '/categories/electronics/tablets', image: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=200&h=150&fit=crop' },
      { title: 'Headphones', href: '/categories/electronics/headphones', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=150&fit=crop' },
      { title: 'Cameras', href: '/categories/electronics/cameras', image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=200&h=150&fit=crop' },
      { title: 'Gaming', href: '/categories/electronics/gaming', image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=200&h=150&fit=crop' },
    ],
  },
  {
    title: 'Fashion',
    href: '/categories/fashion',
    icon: Shirt,
    image: '/fash.png',
    subcategories: [
      { title: "Men's Clothing", href: '/categories/fashion/mens', image: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=200&h=150&fit=crop' },
      { title: "Women's Clothing", href: '/categories/fashion/womens', image: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=200&h=150&fit=crop' },
      { title: 'Shoes', href: '/categories/fashion/shoes', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&h=150&fit=crop' },
      { title: 'Accessories', href: '/categories/fashion/accessories', image: 'https://images.unsplash.com/photo-1523779917675-b6ed3a42a561?w=200&h=150&fit=crop' },
      { title: 'Watches', href: '/categories/fashion/watches', image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=200&h=150&fit=crop' },
      { title: 'Jewelry', href: '/categories/fashion/jewelry', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=150&fit=crop' },
    ],
  },
  {
    title: 'Home & Garden',
    href: '/categories/home',
    icon: Home,
    image: '/home.png',
    subcategories: [
      { title: 'Furniture', href: '/categories/home/furniture', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=150&fit=crop' },
      { title: 'Decor', href: '/categories/home/decor', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200&h=150&fit=crop' },
      { title: 'Kitchen', href: '/categories/home/kitchen', image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=200&h=150&fit=crop' },
      { title: 'Bedding', href: '/categories/home/bedding', image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=200&h=150&fit=crop' },
      { title: 'Garden', href: '/categories/home/garden', image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&h=150&fit=crop' },
      { title: 'Storage', href: '/categories/home/storage', image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=200&h=150&fit=crop' },
    ],
  },
  {
    title: 'Sports',
    href: '/categories/sports',
    icon: Dumbbell,
    image: '/sport.png',
    subcategories: [
      { title: 'Fitness Equipment', href: '/categories/sports/fitness', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200&h=150&fit=crop' },
      { title: 'Outdoor Sports', href: '/categories/sports/outdoor', image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=200&h=150&fit=crop' },
      { title: 'Cycling', href: '/categories/sports/cycling', image: 'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=200&h=150&fit=crop' },
      { title: 'Yoga', href: '/categories/sports/yoga', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&h=150&fit=crop' },
      { title: 'Team Sports', href: '/categories/sports/team', image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=200&h=150&fit=crop' },
      { title: 'Activewear', href: '/categories/sports/activewear', image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=200&h=150&fit=crop' },
    ],
  },
  {
    title: 'Books',
    href: '/categories/books',
    icon: BookOpen,
    image: '/book.png',
    subcategories: [
      { title: 'Fiction', href: '/categories/books/fiction', image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=150&fit=crop' },
      { title: 'Non-Fiction', href: '/categories/books/non-fiction', image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=200&h=150&fit=crop' },
      { title: 'Children', href: '/categories/books/children', image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=200&h=150&fit=crop' },
      { title: 'Education', href: '/categories/books/education', image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=200&h=150&fit=crop' },
      { title: 'Comics', href: '/categories/books/comics', image: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=200&h=150&fit=crop' },
      { title: 'Magazines', href: '/categories/books/magazines', image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=200&h=150&fit=crop' },
    ],
  },
]

// Popular categories for search
const POPULAR_CATEGORIES = [
  { label: 'Electronics', slug: 'electronics' },
  { label: 'Fashion', slug: 'fashion' },
  { label: 'Home & Garden', slug: 'home' },
  { label: 'Sports', slug: 'sports' },
]

// Top Notice Component
const TopNotice: React.FC<{ message: string }> = ({ message }) => {
  const [isVisible, setIsVisible] = React.useState(true)
  
  if (!isVisible) return null
  
  return (
    <div className="bg-primary text-primary-foreground text-center py-2 md:py-2.5 text-xs sm:text-sm font-medium flex items-center justify-center relative px-8 sm:px-10 md:px-12">
      <div className="flex items-center gap-1.5 sm:gap-2 max-w-full overflow-hidden">
        <Megaphone className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
        <span className="truncate">{message}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsVisible(false)}
        className="absolute right-1 sm:right-2 h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground/80 hover:bg-primary/80 hover:text-primary-foreground transition-colors flex-shrink-0"
        aria-label="Close notice"
      >
        <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </Button>
    </div>
  )
}

// Enhanced Search Bar Component
const EnhancedSearchBar: React.FC<{ className?: string; compact?: boolean }> = ({ className, compact = false }) => {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`)
        if (response.ok) {
          const data = await response.json()
          setResults(data.results || [])
        }
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const saveRecentSearch = useCallback((searchTerm: string) => {
    const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 5)
    setRecentSearches(updated)
  }, [recentSearches])

  const handleSearch = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return
    
    saveRecentSearch(searchTerm)
    setIsOpen(false)
    setQuery('')
    router.push(`/products?search=${encodeURIComponent(searchTerm)}`)
  }, [router, saveRecentSearch])

  const handleCategoryClick = useCallback((categorySlug: string, categoryLabel: string) => {
    saveRecentSearch(categoryLabel)
    setIsOpen(false)
    setQuery('')
    router.push(`/products?category=${categorySlug}`)
  }, [router, saveRecentSearch])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    handleSearch(query)
  }, [query, handleSearch])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    inputRef.current?.focus()
  }, [])

  const removeRecentSearch = useCallback((searchTerm: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = recentSearches.filter(s => s !== searchTerm)
    setRecentSearches(updated)
  }, [recentSearches])

  return (
    <div ref={searchRef} className={cn("relative w-full", className)}>
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative flex items-center">
          <div className="relative flex-1">
            <Search className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none",
              compact ? "h-4 w-4" : "h-[18px] w-[18px]"
            )} />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search for products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              className={cn(
  "pl-10 pr-10 rounded-l-md rounded-r-none border-r-0 focus-visible:ring-0 focus-visible:ring-offset-0",
  compact ? "h-9 text-sm" : "h-10 lg:h-11 text-sm"
)}
              autoComplete="off"
            />
            {query && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={clearSearch}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0 hover:bg-muted",
                  compact ? "h-6 w-6" : "h-7 w-7"
                )}
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            )}
          </div>
          <Button 
  type="submit" 
  className={cn(
    "rounded-l-none rounded-r-md font-medium shrink-0",
    compact ? "h-9 px-4" : "h-10 lg:h-11 px-5"
  )}
>
            <Search className={cn(compact ? "h-4 w-4" : "h-[18px] w-[18px]", "sm:mr-2")} />
            <span className="hidden sm:inline">{compact ? "Go" : "Search"}</span>
          </Button>
        </div>
      </form>

      {/* Search Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-1 w-full bg-background rounded-md shadow-lg border max-h-[70vh] sm:max-h-[480px] overflow-y-auto z-50">
          {isLoading && (
            <div className="p-4 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span>Searching...</span>
            </div>
          )}

          {/* Search Results */}
          {!isLoading && results.length > 0 && (
            <div className="py-2">
              <div className="text-xs font-semibold text-muted-foreground px-4 py-2 uppercase tracking-wider">
                Products
              </div>
              <div className="space-y-0.5">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => {
                      setIsOpen(false)
                      router.push(`/products/${result.slug}`)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left"
                  >
                    {result.images[0] && (
                      <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-md overflow-hidden bg-muted flex-shrink-0 border">
                        <Image
                          src={result.images[0]}
                          alt={result.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm sm:text-[15px] truncate text-foreground">
                        {result.name}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground font-medium">
                        ${result.price.toFixed(2)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleSearch(query)}
                className="w-full mt-2 mx-4 mb-2 p-2.5 text-xs sm:text-sm text-primary hover:bg-primary/10 rounded-md transition-colors text-center font-medium border border-primary/20"
                style={{ width: 'calc(100% - 2rem)' }}
              >
                View all results for "{query}"
              </button>
            </div>
          )}

          {/* No Results */}
          {!isLoading && query && results.length === 0 && (
            <div className="p-6 sm:p-8 text-xs sm:text-sm text-muted-foreground text-center">
              <div className="mb-2">No products found for <span className="font-medium text-foreground">"{query}"</span></div>
              <div className="text-xs">Try searching with different keywords</div>
            </div>
          )}

          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="py-2">
              <div className="flex items-center gap-1.5 px-4 py-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Recent Searches
                </div>
              </div>
              <div className="space-y-0.5">
                {recentSearches.map((search, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-accent group"
                  >
                    <button
                      onClick={() => handleSearch(search)}
                      className="flex-1 text-left text-sm sm:text-[15px] text-foreground"
                    >
                      {search}
                    </button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => removeRecentSearch(search, e)}
                      className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 rounded-md hover:bg-muted"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Popular Categories */}
          {!query && (
            <div className="py-2 border-t">
              <div className="flex items-center gap-1.5 px-4 py-2">
                <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Popular Categories
                </div>
              </div>
              <div className="space-y-0.5">
                {POPULAR_CATEGORIES.map((category) => (
                  <button
                    key={category.slug}
                    onClick={() => handleCategoryClick(category.slug, category.label)}
                    className="w-full text-left px-4 py-2 text-sm sm:text-[15px] hover:bg-accent transition-colors flex items-center gap-2.5 text-foreground"
                  >
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    {category.label}
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

// WishlistButton component
const WishlistButton: React.FC<{ compact?: boolean }> = React.memo(({ compact = false }) => {
  const { wishlist } = useCart()
  
  return (
    <Button 
      variant="ghost"
      size="sm" 
      asChild 
      className={cn(
  "relative rounded-lg p-0 hover:bg-accent",
  compact ? "h-8 w-8" : "h-9 w-9 lg:h-10 lg:w-10"
)}
    >
      <Link href="/account/wishlist">
        <Heart className={cn(compact ? "h-[18px] w-[18px]" : "h-5 w-5 sm:h-[22px] sm:w-[22px]")} />
        {wishlist.length > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-4 min-w-[16px] sm:h-5 sm:min-w-[20px] px-0.5 sm:px-1 flex items-center justify-center text-[9px] sm:text-[10px] font-bold rounded-full"
          >
            {wishlist.length > 9 ? '9+' : wishlist.length}
          </Badge>
        )}
        <span className="sr-only">Wishlist ({wishlist.length} items)</span>
      </Link>
    </Button>
  )
})
WishlistButton.displayName = 'WishlistButton'

// CartButton component with different color badge
const CartButton: React.FC<{ compact?: boolean }> = React.memo(({ compact = false }) => {
  const { cart } = useCart({
    autoSync: true, 
    syncInterval: 5000
  })
  
  return (
    <Button 
      variant="ghost"
      size="sm" 
      asChild 
      className={cn(
  "relative rounded-lg p-0 hover:bg-accent",
  compact ? "h-8 w-8" : "h-9 w-9 lg:h-10 lg:w-10"
)}
    >
      <Link href="/cart">
        <ShoppingCart className={cn(compact ? "h-[18px] w-[18px]" : "h-5 w-5 sm:h-[22px] sm:w-[22px]")} />
        {cart.totalItems > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-4 min-w-[16px] sm:h-5 sm:min-w-[20px] px-0.5 sm:px-1 flex items-center justify-center text-[9px] sm:text-[10px] font-bold rounded-full bg-blue-600 hover:bg-blue-600 text-white border-0"
          >
            {cart.totalItems > 9 ? '9+' : cart.totalItems}
          </Badge>
        )}
        <span className="sr-only">Shopping cart ({cart.totalItems} items)</span>
      </Link>
    </Button>
  )
})
CartButton.displayName = 'CartButton'

// UserMenu component
const UserMenu: React.FC<{ session?: any; compact?: boolean }> = React.memo(({ session: serverSession, compact = false }) => {
  const { data: clientSession } = useSession()
  const session = serverSession || clientSession
  
  const handleSignOut = React.useCallback(() => {
    signOut()
  }, [])

  if (!session) {
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        asChild 
        className={cn(
  "rounded-lg font-medium hover:bg-accent gap-1.5",
  compact ? "h-8 px-2.5" : "h-9 lg:h-10 px-3"
)}
      >
        <Link href="/auth/sign-in">
          <User className={cn(compact ? "h-4 w-4" : "h-[18px] w-[18px]")} />
          <span className="hidden sm:inline text-sm">Account</span>
        </Link>
      </Button>
    )
  }

  const userInitials =
    session.user?.name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase() || 'U'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={cn(
            "relative rounded-full p-0 hover:bg-accent",
            compact ? "h-8 w-8" : "h-9 w-9 sm:h-10 sm:w-10"
          )}
        >
          <Avatar className={cn(compact ? "h-7 w-7" : "h-8 w-8 sm:h-9 sm:w-9")}>
            <AvatarImage src={session.user?.image || undefined} alt={session.user?.name || 'User'} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs sm:text-sm">
              {session.user?.image ? '' : userInitials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 rounded-lg" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={session.user?.image || undefined} alt={session.user?.name || 'User'} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {session.user?.image ? '' : userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-0.5">
              <p className="text-sm font-semibold leading-none">{session.user?.name}</p>
              <p className="text-xs text-muted-foreground leading-none">
                {session.user?.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link href="/account" className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>My Account</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link href="/account/orders" className="cursor-pointer">
            <Package className="mr-2 h-4 w-4" />
            <span>Orders</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link href="/account/wishlist" className="cursor-pointer">
            <Heart className="mr-2 h-4 w-4" />
            <span>Wishlist</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link href="/account/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        
        {session.user?.role === 'ADMIN' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard" className="cursor-pointer">
                <Shield className="mr-2 h-4 w-4 text-amber-600" />
                <span className="font-medium">Admin Dashboard</span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})
UserMenu.displayName = 'UserMenu'

// Mega Menu Dropdown Component with Images
const MegaMenuDropdown: React.FC = React.memo(() => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<CategoryWithSubs | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout>(null)

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsOpen(true)
    if (!activeCategory && categoriesWithSubs.length > 0) {
      setActiveCategory(categoriesWithSubs[0])
    }
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
      setActiveCategory(null)
    }, 150)
  }

  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Button 
        variant="ghost" 
        className="h-10 px-3 gap-1.5 font-medium hover:bg-accent"
      >
        <Menu className="h-[18px] w-[18px]" />
        <span>All Categories</span>
        <ChevronDown className="h-4 w-4 ml-0.5" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-0 bg-background border rounded-lg shadow-xl z-50 flex min-w-[800px]">
          <div className="w-64 border-r max-h-[480px] overflow-y-auto p-2">
            {categoriesWithSubs.map((category) => (
              <div
                key={category.href}
                onMouseEnter={() => setActiveCategory(category)}
                className={cn(
                  'flex items-center justify-between gap-2 p-3 rounded-md cursor-pointer transition-colors',
                  activeCategory?.title === category.title
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <div className="flex items-center gap-2">
                  <category.icon className="h-5 w-5" />
                  <span className="font-medium text-sm">{category.title}</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-60" />
              </div>
            ))}
            <div className="border-t mt-2 pt-3 px-3">
              <Link
                href="/products"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                <PackageSearch className="h-4 w-4" />
                View All Products
              </Link>
            </div>
          </div>

          {activeCategory && (
            <div className="flex-1 p-6 max-h-[480px] overflow-y-auto">
              <div className="mb-6">
                <Link
                  href={activeCategory.href}
                  onClick={() => setIsOpen(false)}
                  className="group"
                >
                  {activeCategory.image && (
                    <div className="relative w-full h-32 mb-4 rounded-lg overflow-hidden border bg-muted">
                      <Image
                        src={activeCategory.image}
                        alt={activeCategory.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="500px"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                          <activeCategory.icon className="h-5 w-5" />
                          {activeCategory.title}
                        </h3>
                      </div>
                    </div>
                  )}
                </Link>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                {activeCategory.subcategories.map((sub) => (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    onClick={() => setIsOpen(false)}
                    className="group"
                  >
                    <div className="relative w-full h-24 rounded-md overflow-hidden border bg-muted mb-2">
                      {sub.image && (
                        <Image
                          src={sub.image}
                          alt={sub.title}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                          sizes="150px"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {sub.title}
                    </p>
                  </Link>
                ))}
              </div>
              
              <Link
                href={activeCategory.href}
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center gap-1 mt-6 text-sm font-semibold text-primary hover:underline"
              >
                Shop All {activeCategory.title}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
})
MegaMenuDropdown.displayName = 'MegaMenuDropdown'

// Mobile Navigation
const MobileNav: React.FC<{ session?: any }> = React.memo(({ session: serverSession }) => {
  const { data: clientSession } = useSession();
  const session = serverSession || clientSession;

  const [open, setOpen] = React.useState(false);
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null);

  const toggleCategory = (title: string) => {
    setExpandedCategory(expandedCategory === title ? null : title);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Mobile Menu Button */}
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg p-0 lg:hidden hover:bg-accent"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>

      {/* Drawer */}
      <SheetContent 
        side="left" 
        className="w-[90vw] sm:w-[340px] p-0 bg-background border-r"
      >
        {/* Header */}
        <div className="border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <SheetHeader className="px-5 pt-6 pb-4">
            <SheetTitle>
              <Link
                href="/"
                className="flex items-center gap-2.5"
                onClick={() => setOpen(false)}
              >
                <Image
                  src="/sellora.svg"
                  alt="Sellora"
                  width={110}
                  height={40}
                  className="object-contain"
                />
              </Link>
            </SheetTitle>
            <SheetDescription className="text-left text-muted-foreground text-[13px] mt-1.5">
              Discover amazing products and deals
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Scrollable Section */}
        <div className="h-[calc(100vh-140px)] overflow-y-auto">
          <div className="px-4 py-4 space-y-6">

            {/* Quick Action */}
            <Link
              href="/products"
              onClick={() => setOpen(false)}
              className="flex items-center gap-4 rounded-xl p-4 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                <PackageSearch className="h-5 w-5" />
              </div>
              <span className="text-base font-semibold">Browse All Products</span>
            </Link>

            {/* Categories */}
            <div>
              <div className="flex items-center gap-2 px-3 py-2.5 mb-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Categories
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-2">
                {categoriesWithSubs.map((category) => (
                  <div 
                    key={category.href} 
                    className="border rounded-xl overflow-hidden bg-card"
                  >
                    {/* Parent Category */}
                    <button
                      onClick={() => toggleCategory(category.title)}
                      className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition active:bg-accent"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <category.icon className="h-5 w-5" />
                        </div>
                        <span className="font-semibold text-base">
                          {category.title}
                        </span>
                      </div>

                      <ChevronRight
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-200",
                          expandedCategory === category.title && "rotate-90 text-primary"
                        )}
                      />
                    </button>

                    {/* Subcategories */}
                    <div
                      className={cn(
                        "grid transition-all duration-200 ease-in-out",
                        expandedCategory === category.title
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0"
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="border-t bg-muted/30 px-4 py-3 space-y-1.5">
                          {category.subcategories.map((sub) => (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setOpen(false)}
                              className="flex items-center gap-3 rounded-lg px-3 py-2 text-[15px] hover:bg-background hover:text-primary active:scale-[0.98] transition"
                            >
                              <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                              {sub.title}
                            </Link>
                          ))}

                          <Link
                            href={category.href}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 mt-2 text-[15px] text-primary font-semibold hover:bg-primary/10 active:scale-[0.98] transition"
                          >
                            <ChevronRight className="h-4 w-4" />
                            View All {category.title}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AUTH SECTION */}
            {session ? (
              <>
                {/* Title */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Account
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* User Card */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/10 border">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={session.user?.image || ""} />
                    <AvatarFallback className="bg-primary text-white font-bold">
                      {session.user?.name?.split(" ").map((n: string) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <p className="font-bold truncate">{session.user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {session.user?.email}
                    </p>
                  </div>
                </div>

                {/* Account Links */}
                <div className="space-y-1.5">
                  <MobileLink href="/account" title="My Account" icon={User} setOpen={setOpen} />
                  <MobileLink href="/account/orders" title="My Orders" icon={Package} setOpen={setOpen} color="blue" />
                  <MobileLink href="/account/wishlist" title="Wishlist" icon={Heart} setOpen={setOpen} color="pink" />
                  <MobileLink href="/cart" title="Shopping Cart" icon={ShoppingCart} setOpen={setOpen} color="green" />

                  {session.user?.role === "ADMIN" && (
                    <MobileLink
                      href="/dashboard"
                      title="Admin Dashboard"
                      icon={Shield}
                      setOpen={setOpen}
                      color="amber"
                      bold
                    />
                  )}

                  <button
                    onClick={() => {
                      setOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-3.5 rounded-xl p-3.5 mt-2 border-2 border-destructive/20 hover:bg-destructive/10 active:scale-[0.98] transition"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                      <LogOut className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-[15px] font-semibold text-destructive">Sign Out</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Get Started
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <Button
                  asChild
                  className="w-full rounded-xl h-12 font-semibold shadow-sm"
                >
                  <Link href="/auth/sign-in" onClick={() => setOpen(false)}>
                    Sign In to Your Account
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  asChild
                  className="w-full rounded-xl h-12 font-semibold"
                >
                  <Link href="/auth/sign-up" onClick={() => setOpen(false)}>
                    Create New Account
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Bottom space */}
          <div className="h-8" />
        </div>
      </SheetContent>
    </Sheet>
  );
});

MobileNav.displayName = "MobileNav";
export default MobileNav;

/* Reusable Sub-Component for Account Links */
const MobileLink = ({
  href,
  title,
  icon: Icon,
  setOpen,
  color,
  bold,
}: {
  href: string;
  title: string;
  icon: any;
  setOpen: (v: boolean) => void;
  color?: "blue" | "pink" | "green" | "amber";
  bold?: boolean;
}) => {
  const bg =
    color === "blue"
      ? "bg-blue-500/10 text-blue-600"
      : color === "pink"
      ? "bg-pink-500/10 text-pink-600"
      : color === "green"
      ? "bg-green-500/10 text-green-600"
      : color === "amber"
      ? "bg-amber-500/20 text-amber-700"
      : "bg-primary/10 text-primary";

  return (
    <Link
      href={href}
      onClick={() => setOpen(false)}
      className="flex items-center gap-3.5 rounded-xl p-3.5 hover:bg-accent active:scale-[0.98] transition"
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <span
        className={cn(
          "text-[15px]",
          bold ? "font-semibold text-amber-700" : "font-medium"
        )}
      >
        {title}
      </span>
    </Link>
  );
};

// Compact Header for Scroll Up
const CompactHeader: React.FC<{ session?: any }> = ({ session }) => {
  return (
    <div className="border-b bg-background shadow-md">
      <div className="container px-4 md:px-6 lg:px-8 mx-auto flex h-16 justify-between items-center gap-4">
        {/* LEFT SECTION: Mobile Menu + Logo */}
        <div className="flex items-center  gap-2 lg:gap-3 shrink-0">
          <div className="lg:hidden">
            <MobileNav session={session} />
          </div>
          
          <Link href="/" className="flex items-center">
            <Image 
            src="/sellora.svg" 
            alt="Sellora" 
            width={100} 
            height={100}
            className="object-contain"
          />
          </Link>
        </div>
        
        {/* MIDDLE SECTION: Search Bar - CENTERED */}
        <div className="hidden md:flex flex-1 justify-center">
          <div className="w-full max-w-3xl">
            <EnhancedSearchBar compact />
          </div>
        </div>

        {/* RIGHT SECTION: Action Buttons */}
        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          <UserMenu session={session} compact />
          <WishlistButton compact />
          <CartButton compact />
        </div>
      </div>
    </div>
  )
}

// Main Header Component with eBay-style scroll behavior
export const StoreHeader: React.FC<HeaderProps> = ({ className, session: serverSession }) => {
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [showCompact, setShowCompact] = React.useState(false)
  const [prevScrollPos, setPrevScrollPos] = React.useState(0)
  const [isScrollingDown, setIsScrollingDown] = React.useState(false)
  
  // eBay-style scroll thresholds
  const SCROLL_THRESHOLD = 100 // When to start hiding header
  const SHOW_COMPACT_THRESHOLD = 50 // Minimum scroll up distance to show compact
  const HIDE_SPEED_MULTIPLIER = 1.5 // How quickly to hide when scrolling down

  useEffect(() => {
    let ticking = false
    let lastScrollTime = Date.now()

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollPos = window.scrollY
          const scrollDiff = currentScrollPos - prevScrollPos
          const currentTime = Date.now()
          const timeDiff = currentTime - lastScrollTime
          
          // Calculate scroll velocity (pixels per millisecond)
          const scrollVelocity = Math.abs(scrollDiff) / timeDiff
          
          // Determine scroll direction
          const scrollingDown = scrollDiff > 0
          setIsScrollingDown(scrollingDown)
          
          // Add shadow when scrolled past initial position
          setIsScrolled(currentScrollPos > 10)

          // eBay-style behavior logic
          if (currentScrollPos < SCROLL_THRESHOLD) {
            // Near top: Always show main header, hide compact
            setShowCompact(false)
          } else {
            // Past threshold: Always hide main header
            if (scrollingDown) {
              // Scrolling DOWN: Hide compact header
              setShowCompact(false)
            } else {
              // Scrolling UP: Show compact header with velocity consideration
              const velocityBoost = scrollVelocity > 0.5 ? 0.7 : 1
              const showThreshold = SHOW_COMPACT_THRESHOLD * velocityBoost
              
              if (Math.abs(scrollDiff) > showThreshold || scrollVelocity > 1) {
                setShowCompact(true)
              }
            }
          }

          setPrevScrollPos(currentScrollPos)
          lastScrollTime = currentTime
          ticking = false
        })

        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [prevScrollPos])

  return (
    <>
      <TopNotice message="🚀 Sellora is a production-ready e-commerce platform. This temporary deployment is running on the Vercel free tier until the official domain goes live." />

      {/* Compact Header - Shows on scroll up (eBay style) */}
      <div 
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-transform duration-200 ease-out",
          showCompact ? "translate-y-0" : "-translate-y-full"
        )}
      >
        <CompactHeader session={serverSession} />
      </div>

      {/* Main Header - Static positioning, only search section hides */}
      <header className={cn(
        'w-full bg-background border-b',
        isScrolled && 'shadow-md',
        className
      )}>
        {/* Header content */}
        <div>
          {/* Top Row: Logo + Search + Actions */}
          <div className="border-b">
  <div className="container px-4 md:px-6 lg:px-8 mx-auto">
    {/* Main Header Row - THREE INDEPENDENT SECTIONS */}
    <div className="flex h-14 lg:h-16 justify-between items-center gap-4">
      {/* LEFT SECTION: Mobile Menu + Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <MobileNav session={serverSession} />
        <Link href="/" className="flex items-center">
          <Image 
            src="/sellora.svg" 
            alt="Sellora" 
            width={100} 
            height={100}
            className="object-contain"
          />
        </Link>
      </div>
      
      {/* MIDDLE SECTION: Search Bar - INDEPENDENT & CENTERED */}
      <div className={cn(
        "hidden md:flex flex-1 justify-center transition-all duration-300 ease-out",
        prevScrollPos >= SCROLL_THRESHOLD && "opacity-0 -translate-y-4 pointer-events-none"
      )}>
        <div className="w-full max-w-2xl">
          <EnhancedSearchBar />
        </div>
      </div>

      {/* RIGHT SECTION: Action Buttons - INDEPENDENT */}
      <div className="flex items-center gap-2 lg:gap-3 shrink-0">
        <UserMenu session={serverSession} />
        <WishlistButton />
        <CartButton />
      </div>
    </div>

    {/* Mobile Search - FIXED PADDING */}
    <div className={cn(
      "md:hidden pb-3 pt-2 transition-all duration-300 ease-out",
      prevScrollPos >= SCROLL_THRESHOLD ? "opacity-0 max-h-0 py-0 overflow-hidden" : "opacity-100"
    )}>
      <EnhancedSearchBar />
    </div>
  </div>
</div>
          
          {/* Bottom Row: Category Navigation - Desktop Only - Always visible */}
          <div className="hidden lg:block bg-muted/30">
  <nav className="container px-4 lg:px-8 mx-auto">
    <ul className="flex items-center justify-center gap-1 h-11">
      <li>
        <MegaMenuDropdown />
      </li>
      {mainCategories.map((item) => (
        <li key={item.href}>
          <Link 
            href={item.href}
            className="flex items-center px-4 py-2.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            {item.title}
          </Link>
        </li>
      ))}
      <li>
        <Link 
          href="/products"
          className="flex items-center px-4 py-2.5 text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          All Products
        </Link>
      </li>
    </ul>
  </nav>
</div>
        </div>
      </header>
    </>
  )
}