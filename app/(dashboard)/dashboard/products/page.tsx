/* eslint-disable react/no-unescaped-entities */
// app/(dashboard)/products/page.tsx - Enhanced Version
'use client'

import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Plus, Search, Filter, Eye, Edit, Trash2, AlertTriangle, Package, RefreshCw,
  AlertCircle, TrendingUp, MoreVertical, ChevronLeft, ChevronRight, Star, Layers,
  Tag, Download, Upload, Settings, Grid3x3, List, Command, X, CheckSquare
} from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

// ============================================================================
// TYPES
// ============================================================================

interface Brand {
  id: string
  name: string
  slug: string
  logo: string | null
}

interface Category {
  id: string
  name: string
  slug: string
  image: string | null
}

interface ProductVariant {
  id: string
  name: string
  sku: string
  price: number | null
  stock: number
  attributes: Record<string, string | number | boolean>
  images: string[]
}

interface Product {
  id: string
  name: string
  slug: string
  sku: string | null
  price: number
  comparePrice: number | null
  stock: number
  images: string[]
  isActive: boolean
  isFeatured: boolean
  tags: string[]
  category: Category | null
  brand: Brand | null
  variants: ProductVariant[]
  averageRating?: number
  reviewCount?: number
  _count: {
    reviews: number
    orderItems: number
    variants: number
    wishlistItems: number
  }
  createdAt: string
  updatedAt: string
}

interface ProductsData {
  products: Product[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  meta: {
    stockAlerts: {
      lowStock: number
      outOfStock: number
      total: number
    }
    filters: {
      category: string | null
      brand: string | null
      stock: string | null
      featured: boolean
      search: string | null
      priceRange: { min: string | null; max: string | null } | null
      tags: string[] | null
    }
  }
}

interface FilterState {
  search: string
  stock: string
  category: string
  brand: string
  sortBy: string
  sortOrder: string
  page: number
  featured: boolean | null
  priceMin: string
  priceMax: string
}

interface SavedFilter {
  id: string
  name: string
  filters: Partial<FilterState>
  createdAt: string
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '').slice(0, 100)
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

const debounce = <T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

const useLocalStorage = <T,>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(initialValue)

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (item) {
        setStoredValue(JSON.parse(item))
      }
    } catch (error) {
      console.error(error)
    }
  }, [key])

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(error)
    }
  }

  return [storedValue, setValue] as const
}

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

const useKeyboardShortcuts = (shortcuts: Record<string, () => void>) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = `${e.metaKey || e.ctrlKey ? 'cmd+' : ''}${e.key.toLowerCase()}`
      if (shortcuts[key]) {
        e.preventDefault()
        shortcuts[key]()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const StockBadge = memo(({ stock }: { stock: number }) => {
  if (stock === 0) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        <span className="hidden sm:inline">Out of Stock</span>
        <span className="sm:hidden">Out</span>
      </Badge>
    )
  } else if (stock <= 10) {
    return (
      <Badge className="gap-1 bg-yellow-100 text-yellow-800 border border-yellow-300">
        <AlertTriangle className="h-3 w-3" />
        <span className="hidden sm:inline">Low Stock ({stock})</span>
        <span className="sm:hidden">Low</span>
      </Badge>
    )
  }
  return (
    <Badge className="gap-1 bg-green-100 text-green-800 border border-green-300">
      <Package className="h-3 w-3" />
      <span className="hidden sm:inline">{stock} in stock</span>
      <span className="sm:hidden">{stock}</span>
    </Badge>
  )
})
StockBadge.displayName = 'StockBadge'

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <Card key={i} className="p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-3 w-[200px]" />
            <Skeleton className="h-3 w-[150px]" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      </Card>
    ))}
  </div>
)

const ProductCard = memo(({ 
  product, 
  onDelete, 
  isSelected,
  onSelect 
}: { 
  product: Product
  onDelete: (product: Product) => void
  isSelected: boolean
  onSelect: (id: string) => void
}) => (
  <Card className="overflow-hidden hover:shadow-lg transition-shadow relative">
    <div className="absolute top-2 left-2 z-10">
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onSelect(product.id)}
        aria-label={`Select ${product.name}`}
      />
    </div>
    <div className="aspect-square relative">
      <Image
        src={product.images[0] || '/placeholder.png'}
        alt={product.name}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover"
        priority={false}
      />
      {product.isFeatured && (
        <Badge className="absolute top-2 right-2">
          <Star className="h-3 w-3 mr-1 fill-current" />
          Featured
        </Badge>
      )}
      {product._count.variants > 0 && (
        <Badge variant="secondary" className="absolute bottom-2 right-2">
          <Layers className="h-3 w-3 mr-1" />
          {product._count.variants}
        </Badge>
      )}
    </div>
    <CardContent className="p-4">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold truncate flex-1" title={product.name}>
            {product.name}
          </h3>
          {product.averageRating && product.averageRating > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{product.averageRating.toFixed(1)}</span>
            </div>
          )}
        </div>
        
        {product.brand && (
          <div className="flex items-center gap-2">
            {product.brand.logo && (
              <Image
                src={product.brand.logo}
                alt={product.brand.name}
                width={16}
                height={16}
                className="object-contain"
              />
            )}
            <span className="text-xs text-gray-600">{product.brand.name}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold text-lg">{formatCurrency(product.price)}</span>
            {product.comparePrice && product.comparePrice > product.price && (
              <span className="text-sm text-gray-500 line-through ml-2">
                {formatCurrency(product.comparePrice)}
              </span>
            )}
          </div>
          <StockBadge stock={product.stock} />
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{product._count.orderItems} sold</span>
          <Badge variant={product.isActive ? "default" : "secondary"} className="text-xs">
            {product.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {product.tags && product.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {product.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex gap-1 pt-2">
          <Link href={`/dashboard/products/${product.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/products/${product.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(product)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </CardContent>
  </Card>
))
ProductCard.displayName = 'ProductCard'

const BulkActionsBar = ({ 
  selectedCount, 
  onAction,
  onClearSelection 
}: { 
  selectedCount: number
  onAction: (action: string) => void
  onClearSelection: () => void
}) => {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
      <Card className="shadow-lg border-2">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">{selectedCount} selected</span>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onAction('activate')}
              >
                Activate
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onAction('deactivate')}
              >
                Deactivate
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onAction('export')}
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => onAction('delete')}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>

            <Button 
              variant="ghost" 
              size="sm"
              onClick={onClearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const SavedFiltersMenu = ({
  savedFilters,
  onApply,
  onSave,
  onDelete
}: {
  savedFilters: SavedFilter[]
  onApply: (filter: SavedFilter) => void
  onSave: () => void
  onDelete: (id: string) => void
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm">
        <Settings className="h-4 w-4 mr-2" />
        Saved Filters
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuLabel>My Filters</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={onSave}>
        <Plus className="h-4 w-4 mr-2" />
        Save Current Filter
      </DropdownMenuItem>
      {savedFilters.length > 0 && (
        <>
          <DropdownMenuSeparator />
          {savedFilters.map((filter) => (
            <div key={filter.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-gray-100 rounded-sm">
              <button
                onClick={() => onApply(filter)}
                className="flex-1 text-left text-sm"
              >
                {filter.name}
              </button>
              <button
                onClick={() => onDelete(filter.id)}
                className="p-1 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
)

const Pagination = ({ 
  page, 
  pages, 
  total, 
  limit,
  onPageChange 
}: { 
  page: number
  pages: number
  total: number
  limit: number
  onPageChange: (page: number) => void
}) => {
  if (pages <= 1) return null

  const showPages = 5
  const startPage = Math.max(1, page - Math.floor(showPages / 2))
  const endPage = Math.min(pages, startPage + showPages - 1)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
      <div className="text-sm text-gray-600">
        Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total}
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Previous</span>
        </Button>
        
        <div className="hidden sm:flex gap-1">
          {Array.from({ length: endPage - startPage + 1 }, (_, i) => {
            const pageNum = startPage + i
            return (
              <Button
                key={pageNum}
                variant={page === pageNum ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                aria-label={`Go to page ${pageNum}`}
                aria-current={page === pageNum ? 'page' : undefined}
              >
                {pageNum}
              </Button>
            )
          })}
        </div>

        <div className="sm:hidden text-sm font-medium">
          {page} / {pages}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page === pages}
          aria-label="Next page"
        >
          <span className="hidden sm:inline mr-1">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProductsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // State
  const [productsData, setProductsData] = useState<ProductsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    stock: searchParams.get('stock') || 'all',
    category: 'all',
    brand: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    featured: null,
    priceMin: '',
    priceMax: ''
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [savedFilters, setSavedFilters] = useLocalStorage<SavedFilter[]>('product-saved-filters', [])
  
  const debouncedSearch = useDebounce(filters.search, 500)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'cmd+k': () => searchInputRef.current?.focus(),
    'cmd+n': () => router.push('/dashboard/products/new'),
    'cmd+r': () => fetchProducts(),
  })

  // Fetch filters data
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [categoriesRes, brandsRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/brands')
        ])
        
        if (categoriesRes.ok) {
          const data = await categoriesRes.json()
          setCategories(data.categories || [])
        }
        
        if (brandsRes.ok) {
          const data = await brandsRes.json()
          setBrands(data.brands || [])
        }
      } catch (err) {
        console.error('Error fetching filters:', err)
      }
    }
    
    fetchFilters()
  }, [])

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: filters.page.toString(),
        limit: '20',
        ...(filters.stock !== 'all' && { stock: filters.stock }),
        ...(filters.category !== 'all' && { category: filters.category }),
        ...(filters.brand !== 'all' && { brand: filters.brand }),
        ...(debouncedSearch && { search: sanitizeInput(debouncedSearch) }),
        ...(filters.featured !== null && { featured: filters.featured.toString() }),
        ...(filters.priceMin && { priceMin: filters.priceMin }),
        ...(filters.priceMax && { priceMax: filters.priceMax }),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      })

      const response = await fetch(`/api/products?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setProductsData(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch products'
      setError(message)
      toast.error(message)
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }, [filters, debouncedSearch])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '' && value !== null) {
        params.set(key, value.toString())
      }
    })
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [filters, router])

  // Handlers
  const updateFilter = (key: keyof FilterState, value: string | boolean | null | number) => {
    setFilters(prev => ({ ...prev, [key]: value, page: key !== 'page' ? 1 : prev.page }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      stock: 'all',
      category: 'all',
      brand: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1,
      featured: null,
      priceMin: '',
      priceMax: ''
    })
    setSelectedProducts([])
  }

  const handleDeleteProduct = async () => {
    if (!deleteProduct) return

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/products/${deleteProduct.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete product')

      toast.success('Product deleted successfully')
      await fetchProducts()
      setDeleteProduct(null)
      setSelectedProducts(prev => prev.filter(id => id !== deleteProduct.id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete product')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedProducts.length === 0) return

    try {
      switch (action) {
        case 'activate':
        case 'deactivate':
          await fetch('/api/products/bulk', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ids: selectedProducts,
              action,
              isActive: action === 'activate'
            })
          })
          toast.success(`${selectedProducts.length} products ${action}d`)
          await fetchProducts()
          break

        case 'delete':
          if (confirm(`Delete ${selectedProducts.length} products?`)) {
            await fetch('/api/products/bulk', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids: selectedProducts })
            })
            toast.success(`${selectedProducts.length} products deleted`)
            await fetchProducts()
          }
          break

        case 'export':
          const response = await fetch('/api/products/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedProducts })
          })
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `products-export-${Date.now()}.csv`
          a.click()
          toast.success('Products exported')
          break
      }
      
      setSelectedProducts([])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk action failed')
    }
  }

  const handleSelectProduct = (id: string) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedProducts.length === productsData?.products.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(productsData?.products.map(p => p.id) || [])
    }
  }

  const handleSaveFilter = () => {
    const name = prompt('Enter a name for this filter:')
    if (!name) return

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name,
      filters,
      createdAt: new Date().toISOString()
    }

    setSavedFilters(prev => [...prev, newFilter])
    toast.success('Filter saved')
  }

  const handleApplyFilter = (filter: SavedFilter) => {
    setFilters({ ...filters, ...filter.filters })
    toast.success(`Applied "${filter.name}"`)
  }

  const handleDeleteFilter = (id: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== id))
    toast.success('Filter deleted')
  }

  // Computed values
  const stockAlertCount = useMemo(() => 
    productsData?.meta?.stockAlerts?.total || 0,
    [productsData]
  )

  const hasActiveFilters = useMemo(() => 
    filters.stock !== 'all' || 
    filters.category !== 'all' || 
    filters.brand !== 'all' || 
    debouncedSearch || 
    filters.featured !== null ||
    filters.priceMin ||
    filters.priceMax,
    [filters, debouncedSearch]
  )

  // Render
  return (

<div className="p-4 sm:p-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold">Products Management</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage your product inventory, pricing, and variants
          </p>
          {stockAlertCount > 0 && (
            <div className="flex items-start sm:items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-yellow-800">
                  <strong>{stockAlertCount}</strong> products need attention
                </span>
              </div>
              <Link href="/dashboard/products/stock">
                <Button variant="link" size="sm" className="p-0 h-auto text-yellow-700 whitespace-nowrap">
                  View →
                </Button>
              </Link>
            </div>
          )}
        </div>
        
        {/* Action Buttons - Stacked on mobile, horizontal on desktop */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
          <SavedFiltersMenu
            savedFilters={savedFilters}
            onApply={handleApplyFilter}
            onSave={handleSaveFilter}
            onDelete={handleDeleteFilter}
          />
          <Button 
            variant="outline" 
            size="sm"
            className="w-full sm:w-auto justify-center"
            onClick={() => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = '.csv,.xlsx'
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (file) {
                  const formData = new FormData()
                  formData.append('file', file)
                  try {
                    const res = await fetch('/api/products/import', {
                      method: 'POST',
                      body: formData
                    })
                    if (res.ok) {
                      toast.success('Products imported successfully')
                      fetchProducts()
                    } else {
                      throw new Error('Import failed')
                    }
                  } catch (err) {
                    toast.error('Failed to import products')
                  }
                }
              }
              input.click()
            }}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Link href="/dashboard/products/stock" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full justify-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Stock Alerts
            </Button>
          </Link>
          <Link href="/dashboard/products/new" className="w-full sm:w-auto">
            <Button size="sm" className="w-full justify-center">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Search - Full width on all screens */}
            <div className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Command className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 hidden sm:block" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search products, SKU, tags..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-10 pr-10 w-full"
                  aria-label="Search products"
                />
              </div>
            </div>

            {/* Desktop Filters - Hidden on mobile */}
            <div className="hidden lg:flex gap-2 flex-wrap">
              <Select value={filters.stock} onValueChange={(v) => updateFilter('stock', v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Stock Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock</SelectItem>
                  <SelectItem value="in">In Stock</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                </SelectContent>
              </Select>

              {categories.length > 0 && (
                <Select value={filters.category} onValueChange={(v) => updateFilter('category', v)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.slug}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {brands.length > 0 && (
                <Select value={filters.brand} onValueChange={(v) => updateFilter('brand', v)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.slug}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={filters.sortBy} onValueChange={(v) => updateFilter('sortBy', v)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="salesCount">Sales</SelectItem>
                  <SelectItem value="createdAt">Date</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.sortOrder} onValueChange={(v) => updateFilter('sortOrder', v)}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">
                    {filters.sortBy === 'price' || filters.sortBy === 'stock' ? '↑ Low' : 'A-Z'}
                  </SelectItem>
                  <SelectItem value="desc">
                    {filters.sortBy === 'price' || filters.sortBy === 'stock' ? '↓ High' : 'Z-A'}
                  </SelectItem>
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>More Filters</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={filters.featured === true}
                    onCheckedChange={(checked) => updateFilter('featured', checked ? true : null)}
                  >
                    Featured Only
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-2 space-y-2">
                    <label className="text-xs font-medium">Price Range</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.priceMin}
                        onChange={(e) => updateFilter('priceMin', e.target.value)}
                        className="h-8"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.priceMax}
                        onChange={(e) => updateFilter('priceMax', e.target.value)}
                        className="h-8"
                      />
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={fetchProducts} variant="outline" size="icon" aria-label="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Mobile Filter and Refresh Buttons */}
            <div className="flex gap-2 lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:w-80 overflow-y-auto p-0">
                  <SheetHeader className="px-4 sm:px-6 pt-6 pb-4 border-b">
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="px-4 sm:px-6 py-6 space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Stock Status</label>
                      <Select value={filters.stock} onValueChange={(v) => updateFilter('stock', v)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Stock</SelectItem>
                          <SelectItem value="in">In Stock</SelectItem>
                          <SelectItem value="low">Low Stock</SelectItem>
                          <SelectItem value="out">Out of Stock</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {categories.length > 0 && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Category</label>
                        <Select value={filters.category} onValueChange={(v) => updateFilter('category', v)}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.slug}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {brands.length > 0 && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Brand</label>
                        <Select value={filters.brand} onValueChange={(v) => updateFilter('brand', v)}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Brands</SelectItem>
                            {brands.map((brand) => (
                              <SelectItem key={brand.id} value={brand.slug}>
                                {brand.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium mb-2 block">Sort By</label>
                      <Select value={filters.sortBy} onValueChange={(v) => updateFilter('sortBy', v)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="price">Price</SelectItem>
                          <SelectItem value="stock">Stock</SelectItem>
                          <SelectItem value="salesCount">Sales</SelectItem>
                          <SelectItem value="createdAt">Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Sort Order</label>
                      <Select value={filters.sortOrder} onValueChange={(v) => updateFilter('sortOrder', v)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">
                            {filters.sortBy === 'price' || filters.sortBy === 'stock' ? '↑ Low to High' : 'A to Z'}
                          </SelectItem>
                          <SelectItem value="desc">
                            {filters.sortBy === 'price' || filters.sortBy === 'stock' ? '↓ High to Low' : 'Z to A'}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Featured</label>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="featured"
                          checked={filters.featured === true}
                          onCheckedChange={(checked) => updateFilter('featured', checked ? true : null)}
                        />
                        <label htmlFor="featured" className="text-sm cursor-pointer">Featured products only</label>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Price Range</label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={filters.priceMin}
                          onChange={(e) => updateFilter('priceMin', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={filters.priceMax}
                          onChange={(e) => updateFilter('priceMax', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <Button onClick={clearFilters} variant="outline" className="w-full">
                      Clear All Filters
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <Button onClick={fetchProducts} variant="outline" size="sm" className="px-3">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
              <span className="text-xs sm:text-sm text-gray-600 leading-6">Active filters:</span>
              {filters.stock !== 'all' && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  Stock: {filters.stock}
                  <button 
                    onClick={() => updateFilter('stock', 'all')} 
                    className="ml-1 hover:text-gray-900"
                    aria-label="Remove stock filter"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filters.category !== 'all' && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  Category: {categories.find(c => c.slug === filters.category)?.name}
                  <button 
                    onClick={() => updateFilter('category', 'all')} 
                    className="ml-1 hover:text-gray-900"
                    aria-label="Remove category filter"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filters.brand !== 'all' && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  Brand: {brands.find(b => b.slug === filters.brand)?.name}
                  <button 
                    onClick={() => updateFilter('brand', 'all')} 
                    className="ml-1 hover:text-gray-900"
                    aria-label="Remove brand filter"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {filters.featured && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  Featured
                  <button 
                    onClick={() => updateFilter('featured', null)} 
                    className="ml-1 hover:text-gray-900"
                    aria-label="Remove featured filter"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {(filters.priceMin || filters.priceMax) && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  Price: {filters.priceMin || '0'} - {filters.priceMax || '∞'}
                  <button onClick={() => {
                    updateFilter('priceMin', '')
                    updateFilter('priceMax', '')
                  }} 
                  className="ml-1 hover:text-gray-900"
                  aria-label="Remove price filter"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {debouncedSearch && (
                <Badge variant="secondary" className="gap-1 text-xs max-w-[200px] truncate">
                  Search: "{debouncedSearch}"
                  <button 
                    onClick={() => updateFilter('search', '')} 
                    className="ml-1 hover:text-gray-900 flex-shrink-0"
                    aria-label="Remove search filter"
                  >
                    ×
                  </button>
                </Badge>
              )}
              <Button onClick={clearFilters} variant="ghost" size="sm" className="h-6 text-xs">
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content */}
      {/* Content */}
      {error ? (
        <Card>
          <CardContent className="p-6 sm:p-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Error Loading Products</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6">{error}</p>
            <Button onClick={fetchProducts}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <LoadingSkeleton />
      ) : !productsData || productsData.products.length === 0 ? (
        <Card>
          <CardContent className="p-6 sm:p-8 lg:p-12 text-center">
            <Package className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              {hasActiveFilters ? 'No products found' : 'No products yet'}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              {hasActiveFilters 
                ? 'Try adjusting your search or filters.' 
                : 'Get started by creating your first product.'
              }
            </p>
            {hasActiveFilters ? (
              <Button onClick={clearFilters} variant="outline">
                Clear Filters
              </Button>
            ) : (
              <Link href="/dashboard/products/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Product
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* View Toggle & Stats */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              {/* Hide checkbox on mobile for table view, show on desktop */}
              <div className="hidden lg:block">
                <Checkbox
                  checked={selectedProducts.length === productsData.products.length}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all products"
                />
              </div>
              <div className="text-xs sm:text-sm text-gray-600 flex-1">
                <div>
                  <strong>{productsData.pagination.total}</strong> products found
                </div>
                {productsData.meta.stockAlerts.total > 0 && (
                  <div className="text-yellow-700 mt-1">
                    <span className="block sm:inline">
                      {productsData.meta.stockAlerts.lowStock} low stock
                    </span>
                    <span className="hidden sm:inline mx-1">•</span>
                    <span className="block sm:inline">
                      {productsData.meta.stockAlerts.outOfStock} out of stock
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="hidden lg:flex"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="flex-1 sm:flex-none justify-center"
              >
                <Grid3x3 className="h-4 w-4 sm:mr-0" />
                <span className="ml-2 sm:hidden">Grid View</span>
              </Button>
            </div>
          </div>

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {productsData.products.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product}
                  onDelete={setDeleteProduct}
                  isSelected={selectedProducts.includes(product.id)}
                  onSelect={handleSelectProduct}
                />
              ))}
            </div>
          )}

          {/* Mobile Card List View - Shows when table view on small screens */}
          {viewMode === 'table' && (
            <div className="lg:hidden space-y-3">
              {productsData.products.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex gap-2 sm:gap-3">
                      {/* Product Image */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 relative flex-shrink-0 rounded-lg overflow-hidden">
                        <Image
                          src={product.images[0] || '/placeholder.png'}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 64px, 80px"
                          className="object-cover"
                        />
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1 sm:mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm sm:text-base truncate" title={product.name}>
                              {product.name}
                            </h3>
                            <p className="text-xs text-gray-500 hidden sm:block">
                              {product.sku ? `SKU: ${product.sku}` : 'No SKU'}
                            </p>
                          </div>
                          {product.isFeatured && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              <Star className="h-2 w-2 mr-1 fill-current" />
                              <span className="hidden sm:inline">Featured</span>
                            </Badge>
                          )}
                        </div>
                        
                        {/* Price and Stock */}
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-bold text-sm sm:text-base">{formatCurrency(product.price)}</span>
                            {product.comparePrice && product.comparePrice > product.price && (
                              <span className="text-xs text-gray-500 line-through ml-1">
                                {formatCurrency(product.comparePrice)}
                              </span>
                            )}
                          </div>
                          <StockBadge stock={product.stock} />
                        </div>
                        
                        {/* Meta Info */}
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-gray-600 mb-2 sm:mb-3">
                          {product.brand && (
                            <span className="flex items-center gap-1 truncate max-w-[120px]">
                              {product.brand.logo && (
                                <Image
                                  src={product.brand.logo}
                                  alt={product.brand.name}
                                  width={12}
                                  height={12}
                                  className="object-contain flex-shrink-0"
                                />
                              )}
                              <span className="truncate">{product.brand.name}</span>
                            </span>
                          )}
                          {product.category && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span className="truncate max-w-[100px] hidden sm:inline">{product.category.name}</span>
                            </>
                          )}
                          <span className="hidden sm:inline">•</span>
                          <span>{product._count.orderItems} sold</span>
                          {product.averageRating && product.averageRating > 0 && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {product.averageRating.toFixed(1)}
                              </span>
                            </>
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-1 sm:gap-2">
                          <Link href={`/dashboard/products/${product.id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full text-xs h-8">
                              <Eye className="h-3 w-3 sm:mr-1" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                          </Link>
                          <Link href={`/dashboard/products/${product.id}/edit`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full text-xs h-8">
                              <Edit className="h-3 w-3 sm:mr-1" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
                          </Link>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setDeleteProduct(product)}
                            className="text-red-600 hover:text-red-700 px-2 h-8"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Table View - Desktop Only */}
          {viewMode === 'table' && (
            <div className="hidden lg:block">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Products ({productsData.pagination.total})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left w-12">
                            <Checkbox
                              checked={selectedProducts.length === productsData.products.length}
                              onCheckedChange={handleSelectAll}
                              aria-label="Select all products"
                            />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Brand
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Category
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stock
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Performance
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {productsData.products.map((product) => (
                          <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <Checkbox
                                checked={selectedProducts.includes(product.id)}
                                onCheckedChange={() => handleSelectProduct(product.id)}
                                aria-label={`Select ${product.name}`}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 relative flex-shrink-0">
                                  <Image
                                    src={product.images[0] || '/placeholder.png'}
                                    alt={product.name}
                                    fill
                                    sizes="48px"
                                    className="object-cover rounded-lg"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-gray-900 truncate" title={product.name}>
                                    {product.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {product.sku ? `SKU: ${product.sku}` : 'No SKU'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {product.brand ? (
                                <div className="flex items-center gap-2">
                                  {product.brand.logo && (
                                    <Image
                                      src={product.brand.logo}
                                      alt={product.brand.name}
                                      width={20}
                                      height={20}
                                      className="object-contain"
                                    />
                                  )}
                                  <span className="text-gray-900">{product.brand.name}</span>
                                </div>
                              ) : (
                                <span className="text-gray-500">No brand</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {product.category ? (
                                <Badge variant="outline">
                                  {product.category.name}
                                </Badge>
                              ) : (
                                <span className="text-gray-500">Uncategorized</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                {formatCurrency(product.price)}
                              </div>
                              {product.comparePrice && product.comparePrice > product.price && (
                                <div className="text-xs text-gray-500 line-through">
                                  {formatCurrency(product.comparePrice)}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <StockBadge stock={product.stock} />
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4 text-gray-400" />
                                  <span className="text-gray-900">{product._count.orderItems} sold</span>
                                </div>
                                {product.averageRating && product.averageRating > 0 && (
                                  <div className="flex items-center gap-2">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span className="text-gray-900">
                                      {product.averageRating.toFixed(1)} ({product._count.reviews})
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <Badge variant={product.isActive ? "default" : "secondary"}>
                                  {product.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                                {product.isFeatured && (
                                  <Badge variant="outline" className="text-xs">
                                    <Star className="h-2 w-2 mr-1 fill-current" />
                                    Featured
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Link href={`/dashboard/products/${product.id}`}>
                                  <Button variant="outline" size="sm" aria-label={`View ${product.name}`}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Link href={`/dashboard/products/${product.id}/edit`}>
                                  <Button variant="outline" size="sm" aria-label={`Edit ${product.name}`}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setDeleteProduct(product)}
                                  className="text-red-600 hover:text-red-700"
                                  aria-label={`Delete ${product.name}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Pagination 
            page={productsData.pagination.page}
            pages={productsData.pagination.pages}
            total={productsData.pagination.total}
            limit={productsData.pagination.limit}
            onPageChange={(page) => updateFilter('page', page)}
          />
        </>
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedProducts.length}
        onAction={handleBulkAction}
        onClearSelection={() => setSelectedProducts([])}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent className="mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteProduct?.name}"? This action will soft-delete the product and it can be restored later.
              {deleteProduct && deleteProduct._count.variants > 0 && (
                <span className="block mt-2 text-yellow-700 font-medium">
                  Warning: This product has {deleteProduct._count.variants} variant(s) that will also be affected.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={isDeleting} className="w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProduct}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            >
              {isDeleting ? 'Deleting...' : 'Delete Product'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      
    </div>
  )
}