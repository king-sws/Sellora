/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(dashboard)/dashboard/brands/page.tsx
'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Building2, Plus, Search, Filter, X, RefreshCw, 
  MoreVertical, Eye, Edit, Trash2, AlertCircle,
  Package, TrendingUp, Award, Globe, CheckCircle,
  XCircle, LayoutGrid, List, Download, Upload,
  ArrowUpDown, ChevronLeft, ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

interface Brand {
  id: string
  name: string
  slug: string
  logo: string | null
  description: string | null
  website: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: {
    products: number
  }
}

interface BrandStats {
  totalBrands: number
  activeBrands: number
  brandsWithProducts: number
  brandsWithWebsite: number
  totalProducts: number
  averageProductsPerBrand: number
}

interface TopBrand {
  id: string
  name: string
  slug: string
  productsCount: number
}

// Loading Skeleton
const BrandCardSkeleton = () => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
    </CardContent>
  </Card>
)

const BrandRowSkeleton = () => (
  <div className="flex items-center gap-4 p-4 border-b">
    <Skeleton className="h-12 w-12 rounded-lg" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-24" />
    </div>
    <Skeleton className="h-8 w-20" />
    <Skeleton className="h-8 w-16" />
  </div>
)

export default function BrandsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State
  const [brands, setBrands] = useState<Brand[]>([])
  const [stats, setStats] = useState<BrandStats | null>(null)
  const [topBrands, setTopBrands] = useState<TopBrand[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc'
  )
  const [hasWebsiteFilter, setHasWebsiteFilter] = useState(searchParams.get('hasWebsite') || 'all')
  const [minProducts, setMinProducts] = useState(searchParams.get('minProducts') || '')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'))
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  // Fetch brands
  const fetchBrands = useCallback(async (silent = false) => {
    try {
      if (!silent) setRefreshing(true)
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter !== 'all' && { includeInactive: 'true' }),
        sortBy,
        sortOrder,
        ...(hasWebsiteFilter !== 'all' && { hasWebsite: hasWebsiteFilter }),
        ...(minProducts && { minProducts })
      })
      
      const response = await fetch(`/api/brands?${params}`)
      
      if (!response.ok) throw new Error('Failed to fetch brands')
      
      const data = await response.json()
      
      setBrands(data.brands)
      setStats(data.meta.statistics)
      setTopBrands(data.meta.topBrands)
      setTotalPages(data.pagination.pages)
      setTotal(data.pagination.total)
      
      if (!silent) {
        toast.success('Brands updated')
      }
    } catch (error) {
      console.error('Error fetching brands:', error)
      toast.error('Failed to load brands')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [currentPage, searchQuery, statusFilter, sortBy, sortOrder, hasWebsiteFilter, minProducts])

  useEffect(() => {
    fetchBrands()
  }, [fetchBrands])

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (sortBy !== 'name') params.set('sortBy', sortBy)
    if (sortOrder !== 'asc') params.set('sortOrder', sortOrder)
    if (hasWebsiteFilter !== 'all') params.set('hasWebsite', hasWebsiteFilter)
    if (minProducts) params.set('minProducts', minProducts)
    if (currentPage > 1) params.set('page', currentPage.toString())
    
    const newUrl = params.toString() ? `?${params.toString()}` : '/dashboard/brands'
    router.push(newUrl, { scroll: false })
  }, [searchQuery, statusFilter, sortBy, sortOrder, hasWebsiteFilter, minProducts, currentPage, router])

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setSortBy('name')
    setSortOrder('asc')
    setHasWebsiteFilter('all')
    setMinProducts('')
    setCurrentPage(1)
  }

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    return [
      searchQuery,
      statusFilter !== 'all',
      sortBy !== 'name',
      sortOrder !== 'asc',
      hasWebsiteFilter !== 'all',
      minProducts
    ].filter(Boolean).length
  }, [searchQuery, statusFilter, sortBy, sortOrder, hasWebsiteFilter, minProducts])

  // Export brands
  const exportBrands = () => {
    const csv = [
      ['Name', 'Slug', 'Products', 'Website', 'Status', 'Created'].join(','),
      ...brands.map(brand => [
        brand.name,
        brand.slug,
        brand._count.products,
        brand.website || 'N/A',
        brand.isActive ? 'Active' : 'Inactive',
        formatDate(brand.createdAt, 'short')
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `brands-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    
    toast.success('Brands exported')
  }

  // Delete brand (placeholder)
  const handleDelete = async (brandId: string) => {
    if (!confirm('Are you sure you want to delete this brand?')) return
    
    try {
      const response = await fetch(`/api/brands/${brandId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }
      
      toast.success('Brand deleted successfully')
      fetchBrands()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete brand')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <BrandCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              Brands Management
            </h1>
            <p className="text-slate-600 mt-1">
              Manage your product brands and their details
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={exportBrands}
              variant="outline"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            
            <Button
              onClick={() => fetchBrands()}
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button asChild>
              <Link href="/dashboard/brands/new">
                <Plus className="w-4 h-4 mr-2" />
                Add Brand
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Brands</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{stats.totalBrands}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Active Brands</p>
                    <p className="text-2xl font-bold text-green-900 mt-1">{stats.activeBrands}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-purple-200 bg-purple-50/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Total Products</p>
                    <p className="text-2xl font-bold text-purple-900 mt-1">{stats.totalProducts}</p>
                  </div>
                  <Package className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">Avg Products/Brand</p>
                    <p className="text-2xl font-bold text-orange-900 mt-1">
                      {stats.averageProductsPerBrand.toFixed(1)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Top Brands */}
        {topBrands.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                Top Performing Brands
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {topBrands.map((brand, index) => (
                  <Link key={brand.id} href={`/dashboard/brands/${brand.id}`}>
                    <Badge 
                      variant="outline" 
                      className="text-sm py-2 px-3 hover:bg-amber-100 cursor-pointer"
                    >
                      #{index + 1} {brand.name} ({brand.productsCount} products)
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters & Search */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters & Search
              </CardTitle>
              {activeFiltersCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="text-blue-600"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear all ({activeFiltersCount})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="sm:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search brands..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Website Filter */}
              <Select value={hasWebsiteFilter} onValueChange={setHasWebsiteFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Website" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  <SelectItem value="true">Has Website</SelectItem>
                  <SelectItem value="false">No Website</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Sort By */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="createdAt">Date Created</SelectItem>
                  <SelectItem value="productsCount">Product Count</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Sort Order */}
              <Button
                variant="outline"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="w-full"
              >
                <ArrowUpDown className="w-4 h-4 mr-2" />
                {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </Button>
              
              {/* Min Products */}
              <Input
                type="number"
                placeholder="Min products"
                value={minProducts}
                onChange={(e) => setMinProducts(e.target.value)}
                min="0"
              />
              
              {/* View Mode */}
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="flex-1"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="flex-1"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-slate-600">
          <p>
            Showing {brands.length} of {total} brands
          </p>
          <p>
            Page {currentPage} of {totalPages}
          </p>
        </div>

        {/* Brands Grid/List */}
        {brands.length > 0 ? (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {brands.map((brand) => (
                  <BrandCard key={brand.id} brand={brand} onDelete={handleDelete} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-200">
                    {brands.map((brand) => (
                      <BrandRow key={brand.id} brand={brand} onDelete={handleDelete} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No brands found</h3>
              <p className="text-slate-600 mb-4">
                {activeFiltersCount > 0 
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first brand'
                }
              </p>
              {activeFiltersCount > 0 ? (
                <Button variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/dashboard/brands/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Brand
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// Brand Card Component (Grid View)
function BrandCard({ brand, onDelete }: { brand: Brand; onDelete: (id: string) => void }) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border-2 border-slate-200">
              {brand.logo ? (
                <Image
                  src={brand.logo}
                  alt={brand.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-slate-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">{brand.name}</h3>
              <p className="text-sm text-slate-500 truncate">{brand.slug}</p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/brands/${brand.id}`}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/brands/${brand.id}/edit`}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(brand.id)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {brand.description && (
          <p className="text-sm text-slate-600 line-clamp-2 mb-3">
            {brand.description}
          </p>
        )}
        
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={brand.isActive ? 'default' : 'secondary'}>
            {brand.isActive ? 'Active' : 'Inactive'}
          </Badge>
          
          <Badge variant="outline" className="gap-1">
            <Package className="w-3 h-3" />
            {brand._count.products} products
          </Badge>
          
          {brand.website && (
            <Badge variant="outline" className="gap-1">
              <Globe className="w-3 h-3" />
              Website
            </Badge>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Created {formatDate(brand.createdAt, 'short')}</span>
            {brand.website && (
              <a 
                href={brand.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Visit site
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Brand Row Component (List View)
function BrandRow({ brand, onDelete }: { brand: Brand; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
      <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
        {brand.logo ? (
          <Image
            src={brand.logo}
            alt={brand.name}
            width={48}
            height={48}
            className="w-full h-full object-contain p-1"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-6 h-6 text-slate-400" />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-slate-900 truncate">{brand.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-slate-500 truncate">{brand.slug}</p>
          {brand.website && (
            <a 
              href={brand.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              <Globe className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <Badge variant={brand.isActive ? 'default' : 'secondary'}>
          {brand.isActive ? 'Active' : 'Inactive'}
        </Badge>
        
        <Badge variant="outline" className="gap-1">
          <Package className="w-3 h-3" />
          {brand._count.products}
        </Badge>
        
        <div className="text-sm text-slate-500 w-24 text-right">
          {formatDate(brand.createdAt, 'short')}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/brands/${brand.id}`}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/brands/${brand.id}/edit`}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(brand.id)}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}