// components/store/CategoryFilters.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { X, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterState {
  priceRange: [number, number];
  brands: string[];
  inStockOnly: boolean;
  onSaleOnly: boolean;
  featuredOnly: boolean;
  minRating: number;
}

interface CategoryFiltersProps {
  // Available brands from products
  availableBrands: Array<{ name: string; count: number }>;
  
  // Current applied filters
  filters: FilterState;
  
  // Callback when filters should be applied
  onApplyFilters: (filters: FilterState) => void;
  
  // Total product count
  totalProducts: number;
  
  // Mobile view control
  isOpen?: boolean;
  onClose?: () => void;
  
  // Optional: Subcategories
  subcategories?: Array<{ title: string; href: string; count?: number }>;
  
  // Current category info
  categoryName?: string;
  categorySlug?: string;
}

const DEFAULT_FILTERS: FilterState = {
  priceRange: [0, 5000],
  brands: [],
  inStockOnly: false,
  onSaleOnly: false,
  featuredOnly: false,
  minRating: 0
};

export function CategoryFilters({
  availableBrands,
  filters,
  onApplyFilters,
  totalProducts,
  isOpen = false,
  onClose,
  subcategories = [],
  categoryName = '',
  categorySlug = ''
}: CategoryFiltersProps) {
  // Temporary state for user selections (before applying)
  const [tempFilters, setTempFilters] = useState<FilterState>(filters);
  
  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState({
    subcategories: true,
    price: true,
    brands: true,
    availability: true,
    rating: true
  });

  // Sync temp filters when applied filters change externally
  useEffect(() => {
    setTempFilters(filters);
  }, [filters]);

  // Check if there are unapplied changes
  const hasUnappliedChanges = JSON.stringify(tempFilters) !== JSON.stringify(filters);
  
  // Count active filters
  const activeFiltersCount = 
    (filters.priceRange[0] !== DEFAULT_FILTERS.priceRange[0] || 
     filters.priceRange[1] !== DEFAULT_FILTERS.priceRange[1] ? 1 : 0) +
    filters.brands.length +
    (filters.inStockOnly ? 1 : 0) +
    (filters.onSaleOnly ? 1 : 0) +
    (filters.featuredOnly ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleBrand = (brand: string) => {
    setTempFilters(prev => ({
      ...prev,
      brands: prev.brands.includes(brand)
        ? prev.brands.filter(b => b !== brand)
        : [...prev.brands, brand]
    }));
  };

  const handleApplyFilters = () => {
    onApplyFilters(tempFilters);
    onClose?.();
  };

  const handleClearAll = () => {
    setTempFilters(DEFAULT_FILTERS);
    onApplyFilters(DEFAULT_FILTERS);
  };

  const handleResetChanges = () => {
    setTempFilters(filters);
  };

  return (
    <aside
      className={cn(
        "w-full lg:w-72 flex-shrink-0 transition-all duration-300",
        "lg:block",
        isOpen
          ? "fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto lg:static lg:bg-transparent"
          : "hidden lg:block"
      )}
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 lg:sticky lg:top-4">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Filters
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Filter Header - Desktop */}
        <div className="hidden lg:block p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              Filters
            </h2>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {activeFiltersCount} active
              </Badge>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Clear all filters
            </Button>
          )}
        </div>

        <div className="p-4 space-y-6 max-h-[calc(100vh-200px)] lg:max-h-none overflow-y-auto">
          {/* Subcategories */}
          {subcategories.length > 0 && (
            <div>
              <button
                onClick={() => toggleSection('subcategories')}
                className="flex items-center justify-between w-full mb-3 text-left"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Subcategories
                </h3>
                {expandedSections.subcategories ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </button>
              
              {expandedSections.subcategories && (
                <div className="space-y-1">
                  <a
                    href={`/categories/${categorySlug}`}
                    className="block px-3 py-2.5 rounded-lg text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors font-medium text-sm"
                  >
                    <span>All {categoryName}</span>
                    <span className="text-gray-600 dark:text-gray-400 ml-2">
                      ({totalProducts})
                    </span>
                  </a>
                  {subcategories.map((subcat) => (
                    <a
                      key={subcat.href}
                      href={subcat.href}
                      className="block px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
                    >
                      {subcat.title}
                      {subcat.count !== undefined && (
                        <span className="text-gray-500 dark:text-gray-500 ml-2">
                          ({subcat.count})
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Price Range */}
          <div className="pt-4 border-t dark:border-gray-800">
            <button
              onClick={() => toggleSection('price')}
              className="flex items-center justify-between w-full mb-3 text-left"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Price Range
              </h3>
              {expandedSections.price ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>

            {expandedSections.price && (
              <div>
                <Slider
                  value={tempFilters.priceRange}
                  onValueChange={(value) =>
                    setTempFilters(prev => ({
                      ...prev,
                      priceRange: value as [number, number]
                    }))
                  }
                  max={5000}
                  step={50}
                  className="mb-4"
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    ${tempFilters.priceRange[0]}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    ${tempFilters.priceRange[1]}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Brands */}
          {availableBrands.length > 0 && (
            <div className="pt-4 border-t dark:border-gray-800">
              <button
                onClick={() => toggleSection('brands')}
                className="flex items-center justify-between w-full mb-3 text-left"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Brands
                  {tempFilters.brands.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {tempFilters.brands.length}
                    </Badge>
                  )}
                </h3>
                {expandedSections.brands ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </button>

              {expandedSections.brands && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableBrands.map((brand) => (
                    <label
                      key={brand.name}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
                    >
                      <Checkbox
                        checked={tempFilters.brands.includes(brand.name)}
                        onCheckedChange={() => toggleBrand(brand.name)}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                        {brand.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({brand.count})
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Availability & Special Offers */}
          <div className="pt-4 border-t dark:border-gray-800">
            <button
              onClick={() => toggleSection('availability')}
              className="flex items-center justify-between w-full mb-3 text-left"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Availability
              </h3>
              {expandedSections.availability ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>

            {expandedSections.availability && (
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors">
                  <Checkbox
                    checked={tempFilters.inStockOnly}
                    onCheckedChange={(checked) =>
                      setTempFilters(prev => ({
                        ...prev,
                        inStockOnly: checked as boolean
                      }))
                    }
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    In Stock Only
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors">
                  <Checkbox
                    checked={tempFilters.onSaleOnly}
                    onCheckedChange={(checked) =>
                      setTempFilters(prev => ({
                        ...prev,
                        onSaleOnly: checked as boolean
                      }))
                    }
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    On Sale
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors">
                  <Checkbox
                    checked={tempFilters.featuredOnly}
                    onCheckedChange={(checked) =>
                      setTempFilters(prev => ({
                        ...prev,
                        featuredOnly: checked as boolean
                      }))
                    }
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Featured Products
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Rating Filter */}
          <div className="pt-4 border-t dark:border-gray-800">
            <button
              onClick={() => toggleSection('rating')}
              className="flex items-center justify-between w-full mb-3 text-left"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Customer Rating
              </h3>
              {expandedSections.rating ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>

            {expandedSections.rating && (
              <RadioGroup
                value={tempFilters.minRating.toString()}
                onValueChange={(value) =>
                  setTempFilters(prev => ({
                    ...prev,
                    minRating: parseInt(value)
                  }))
                }
                className="space-y-2"
              >
                {[4, 3, 2, 1, 0].map((rating) => (
                  <div key={rating} className="flex items-center space-x-2">
                    <RadioGroupItem value={rating.toString()} id={`rating-${rating}`} />
                    <Label
                      htmlFor={`rating-${rating}`}
                      className="text-sm cursor-pointer flex items-center gap-1"
                    >
                      {rating > 0 ? (
                        <>
                          <span className="text-yellow-500">★</span>
                          <span>{rating}+ Stars</span>
                        </>
                      ) : (
                        <span>All Ratings</span>
                      )}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>
        </div>

        {/* Apply Filters Button - Sticky at bottom */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
          <div className="space-y-2">
            {hasUnappliedChanges && (
              <>
                <Button
                  onClick={handleApplyFilters}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Apply Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-white text-blue-700">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
                <Button
                  onClick={handleResetChanges}
                  variant="outline"
                  className="w-full"
                >
                  Reset Changes
                </Button>
              </>
            )}
            
            {!hasUnappliedChanges && activeFiltersCount > 0 && (
              <Button
                onClick={handleClearAll}
                variant="outline"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Clear All Filters
              </Button>
            )}

            {!hasUnappliedChanges && activeFiltersCount === 0 && (
              <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                No filters applied
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}