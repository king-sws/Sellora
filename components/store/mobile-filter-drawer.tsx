// components/store/mobile-filter-drawer.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Filter } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ProductFilters } from './product-filters'

interface MobileFilterDrawerProps {
  categories: Array<{
    id: string
    name: string
    slug: string
    _count: { products: number }
  }>
  currentCategory?: string
  currentSort?: string
  currentMinPrice?: string
  currentMaxPrice?: string
  featuredCount?: number
  inStockCount?: number
  activeFiltersCount?: number
}

export function MobileFilterDrawer({
  categories,
  currentCategory,
  currentSort,
  currentMinPrice,
  currentMaxPrice,
  featuredCount,
  inStockCount,
  activeFiltersCount = 0
}: MobileFilterDrawerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge 
              variant="destructive" 
              className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 sm:w-96">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Filters</SheetTitle>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  window.location.href = '/products'
                  setOpen(false)
                }}
              >
                Clear all
              </Button>
            )}
          </div>
        </SheetHeader>
        
        <div className="mt-6 overflow-y-auto max-h-[calc(100vh-120px)] pb-20">
          <ProductFilters
            categories={categories}
            currentCategory={currentCategory}
            currentSort={currentSort}
            currentMinPrice={currentMinPrice}
            currentMaxPrice={currentMaxPrice}
            featuredCount={featuredCount}
            inStockCount={inStockCount}
          />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t">
          <Button 
            className="w-full" 
            onClick={() => setOpen(false)}
          >
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}