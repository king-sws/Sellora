/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(dashboard)/products/stock/page.tsx - Enhanced Stock Management Page
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  AlertTriangle, 
  Package, 
  Search, 
  RefreshCw, 
  Edit, 
  TrendingDown,
  AlertCircle,
  Zap,
  Download,
  Loader2,
  Eye,
  EyeOff,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  ShoppingCart,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'

interface Product {
  id: string
  name: string
  slug: string
  sku: string | null
  price: number
  stock: number
  images: string[]
  salesCount?: number
  category: {
    id: string
    name: string
    slug: string
  } | null
  brand?: {
    id: string
    name: string
    slug: string
    logo: string | null
  } | null
  urgencyScore?: number
  status?: 'critical' | 'urgent' | 'warning'
  metrics?: {
    salesLast30Days: number
    avgDailySales: number
    daysUntilEmpty: number | null
    inCarts: number
    totalOrders: number
  }
  _count: {
    orderItems: number
    cartItems?: number
  }
}

interface StockData {
  products: Product[]
  summary: {
    threshold: number
    products: {
      total: number
      lowStock: number
      outOfStock: number
      withIssues: number
      percentageWithIssues: number
    }
    overall: {
      totalItems: number
      lowStock: number
      outOfStock: number
      totalWithIssues: number
    }
    criticalCount: number
    urgentCount: number
  }
  pagination: {
    page: number
    limit: number
    totalProducts: number
    hasMore: boolean
  }
  filters: {
    type: string
    threshold: number
    sortBy: string
    includeVariants: boolean
  }
}

const MetricCardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-4 rounded" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-4 w-full" />
    </CardContent>
  </Card>
)

export default function StockManagementPage() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('type') || 'all'
  
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState(initialTab)
  const [threshold, setThreshold] = useState('10')
  const [sortBy, setSortBy] = useState('urgency')
  const [hiddenMetrics, setHiddenMetrics] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      fetchStockData()
      toast.success('Stock data refreshed automatically')
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [autoRefresh, activeTab, threshold, sortBy])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault()
        fetchStockData()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault()
        handleExport()
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [stockData])

  useEffect(() => {
    fetchStockData()
  }, [activeTab, threshold, sortBy])

  const fetchStockData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (activeTab !== 'all') {
        params.set('type', activeTab)
      }
      params.set('threshold', threshold)
      params.set('sortBy', sortBy)
      params.set('includeVariants', 'false')
      
      const url = `/api/products/stock-alerts?${params}`
      console.log('Fetching stock data from:', url)
      
      const response = await fetch(url)
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Stock data received:', {
          productsCount: data.products?.length || 0,
          summary: data.summary
        })
        setStockData(data)
        toast.success('Stock data loaded successfully')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || 'Failed to fetch stock data')
      }
    } catch (error) {
      console.error('Error fetching stock data:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch stock data')
      toast.error('Failed to load stock data')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!stockData) {
      toast.error('No data to export')
      return
    }
    setIsExporting(true)
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        filters: stockData.filters,
        summary: stockData.summary,
        products: stockData.products.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          stock: p.stock,
          price: p.price,
          category: p.category?.name,
          status: p.status,
          urgencyScore: p.urgencyScore,
          metrics: p.metrics
        }))
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stock-alerts-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Stock data exported successfully')
    } catch (error) {
      toast.error('Failed to export data')
    } finally {
      setIsExporting(false)
    }
  }

  const toggleMetric = (metric: string) => {
    setHiddenMetrics(prev => {
      const newSet = new Set(prev)
      if (newSet.has(metric)) {
        newSet.delete(metric)
      } else {
        newSet.add(metric)
      }
      return newSet
    })
  }

  const getStockBadge = (product: Product) => {
    if (product.status === 'critical' || product.stock === 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Out of Stock
        </Badge>
      )
    } else if (product.status === 'urgent') {
      return (
        <Badge className="gap-1 bg-orange-100 text-orange-800 hover:bg-orange-200">
          <AlertTriangle className="h-3 w-3" />
          Urgent ({product.stock})
        </Badge>
      )
    } else if (product.status === 'warning' || product.stock <= parseInt(threshold)) {
      return (
        <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800">
          <AlertTriangle className="h-3 w-3" />
          Low Stock ({product.stock})
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800">
          <Package className="h-3 w-3" />
          In Stock ({product.stock})
        </Badge>
      )
    }
  }

  const getUrgencyBadge = (score?: number) => {
    if (!score) return null
    if (score >= 90) {
      return <Badge variant="destructive" className="text-xs">Critical: {score}</Badge>
    } else if (score >= 70) {
      return <Badge className="bg-orange-500 hover:bg-orange-600 text-xs">Urgent: {score}</Badge>
    } else if (score >= 50) {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-xs">Warning: {score}</Badge>
    }
    return <Badge variant="outline" className="text-xs">Score: {score}</Badge>
  }

  const filteredProducts = useMemo(() => {
    return stockData?.products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.category?.name.toLowerCase().includes(searchTerm.toLowerCase()))
    ) || []
  }, [stockData?.products, searchTerm])

  const insights = useMemo(() => {
    if (!stockData) return []
    const insights: Array<{ type: 'success' | 'warning' | 'info'; message: string }> = []
    
    if (stockData.summary.criticalCount > 0) {
      insights.push({ 
        type: 'warning', 
        message: `${stockData.summary.criticalCount} products are completely out of stock and need immediate restocking!` 
      })
    }
    
    if (stockData.summary.urgentCount > 5) {
      insights.push({ 
        type: 'warning', 
        message: `${stockData.summary.urgentCount} products are at critically low levels. Consider bulk ordering.` 
      })
    }
    
    if (stockData.summary.products.percentageWithIssues > 20) {
      insights.push({ 
        type: 'info', 
        message: `${stockData.summary.products.percentageWithIssues}% of your inventory needs attention.` 
      })
    } else if (stockData.summary.products.percentageWithIssues < 5) {
      insights.push({ 
        type: 'success', 
        message: 'Excellent inventory management! Less than 5% of products have stock issues. 🎉' 
      })
    }
    
    return insights
  }, [stockData])

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load stock data</AlertTitle>
          <AlertDescription>
            <p className="text-sm text-gray-600 mb-3">{error}</p>
            <div className="flex gap-2">
              <Button onClick={fetchStockData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={() => setError(null)} variant="ghost" size="sm">
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            Stock Management
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Monitor and manage your product inventory levels in real-time
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <kbd className="px-2 py-1 bg-gray-100 border rounded">Ctrl+R</kbd>
            <span>Refresh</span>
            <kbd className="px-2 py-1 bg-gray-100 border rounded">Ctrl+E</kbd>
            <span>Export</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              setAutoRefresh(!autoRefresh)
              toast.success(autoRefresh ? 'Auto-refresh disabled' : 'Auto-refresh enabled (every 5min)')
            }}
            variant="outline"
            size="sm"
            className={autoRefresh ? 'border-green-500 text-green-600' : ''}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto
          </Button>
          <Select value={threshold} onValueChange={setThreshold}>
            <SelectTrigger className="w-[130px]">
              <Target className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Threshold: 5</SelectItem>
              <SelectItem value="10">Threshold: 10</SelectItem>
              <SelectItem value="20">Threshold: 20</SelectItem>
              <SelectItem value="50">Threshold: 50</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[130px]">
              <BarChart3 className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgency">By Urgency</SelectItem>
              <SelectItem value="stock">By Stock</SelectItem>
              <SelectItem value="sales">By Sales</SelectItem>
              <SelectItem value="name">By Name</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExport} variant="outline" size="sm" disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export
          </Button>
          <Button onClick={fetchStockData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
    
        </div>
      </div>

      {/* Insights Banner */}
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((insight, index) => (
            <Alert
              key={index}
              variant={insight.type === 'warning' ? 'destructive' : 'default'}
              className={
                insight.type === 'success' ? 'border-green-200 bg-green-50' :
                insight.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                'border-blue-200 bg-blue-50'
              }
            >
              {insight.type === 'success' && <TrendingUp className="h-4 w-4 text-green-600" />}
              {insight.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
              {insight.type === 'info' && <Target className="h-4 w-4 text-blue-600" />}
              <AlertDescription className={
                insight.type === 'success' ? 'text-green-800' :
                insight.type === 'warning' ? 'text-yellow-800' :
                'text-blue-800'
              }>
                {insight.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Key Metrics */}
      {stockData && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Key Metrics</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (hiddenMetrics.size > 0) {
                  setHiddenMetrics(new Set())
                } else {
                  setHiddenMetrics(new Set(['outOfStock', 'lowStock', 'critical', 'total']))
                }
              }}
            >
              {hiddenMetrics.size > 0 ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {!hiddenMetrics.has('outOfStock') && (
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => toggleMetric('outOfStock')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold text-red-600">
                    {stockData.summary.products.outOfStock}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Products need immediate restocking
                  </div>
                </CardContent>
              </Card>
            )}

            {!hiddenMetrics.has('lowStock') && (
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => toggleMetric('lowStock')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold text-yellow-600">
                    {stockData.summary.products.lowStock}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Products with ≤{threshold} units
                  </div>
                </CardContent>
              </Card>
            )}

            {!hiddenMetrics.has('critical') && (
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => toggleMetric('critical')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Critical Items</CardTitle>
                  <TrendingDown className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold text-orange-600">
                    {stockData.summary.criticalCount + stockData.summary.urgentCount}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Urgent attention required
                  </div>
                </CardContent>
              </Card>
            )}

            {!hiddenMetrics.has('total') && (
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => toggleMetric('total')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Health Score</CardTitle>
                  <Target className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold">
                    {100 - stockData.summary.products.percentageWithIssues}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stockData.summary.products.withIssues} of {stockData.summary.products.total} need attention
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
              <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                <TabsTrigger value="all">
                  All Issues
                  {stockData && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {stockData.summary.products.withIssues}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="out" className="text-red-600">
                  Out of Stock
                  {stockData && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      {stockData.summary.products.outOfStock}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="low" className="text-yellow-600">
                  Low Stock
                  {stockData && (
                    <Badge className="ml-2 text-xs bg-yellow-500">
                      {stockData.summary.products.lowStock}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products, SKU, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Stock Alerts ({filteredProducts.length})</span>
            {sortBy === 'urgency' && (
              <Badge variant="outline" className="text-xs">
                Sorted by Urgency Score
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No products found' : 'No stock issues found'}
              </h3>
              <p className="text-gray-500 mb-4 text-sm sm:text-base">
                {searchTerm 
                  ? 'Try adjusting your search terms'
                  : 'All your products have healthy stock levels!'
                }
              </p>
              {searchTerm && (
                <Button variant="outline" onClick={() => setSearchTerm('')}>
                  Clear Search
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-all hover:shadow-md"
                >
                  {/* Product Image */}
                  <div className="w-16 h-16 relative flex-shrink-0">
                    <Image
                      src={product.images[0] || '/placeholder.png'}
                      alt={product.name}
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0 w-full sm:w-auto">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                        {product.name}
                      </h3>
                      {getUrgencyBadge(product.urgencyScore)}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      {product.sku && (
                        <span className="text-gray-500 text-xs sm:text-sm">
                          SKU: {product.sku}
                        </span>
                      )}
                      {product.category && (
                        <>
                          <span className="text-gray-300">•</span>
                          <Badge variant="outline" className="text-xs">
                            {product.category.name}
                          </Badge>
                        </>
                      )}
                      {product.brand && (
                        <>
                          <span className="text-gray-300">•</span>
                          <Badge variant="outline" className="text-xs">
                            {product.brand.name}
                          </Badge>
                        </>
                      )}
                    </div>
                    {product.metrics && (
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-600">
                        <span>📊 {product.metrics.salesLast30Days} sales (30d)</span>
                        <span>🛒 {product.metrics.inCarts} in carts</span>
                        {product.metrics.daysUntilEmpty && (
                          <span className="text-orange-600 font-medium">
                            ⏰ {product.metrics.daysUntilEmpty} days until empty
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stock Status */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                    <div className="text-center">
                      {getStockBadge(product)}
                      <div className="text-xs text-gray-500 mt-1">
                        ${product.price.toFixed(2)}
                      </div>
                    </div>

                    {/* Sales Info */}
                    <div className="text-center">
                      <div className="text-sm font-medium">
                        {product._count.orderItems}
                      </div>
                      <div className="text-xs text-gray-500">
                        Total Sales
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Link href={`/dashboard/products/${product.id}/edit`} className="flex-1 sm:flex-none">
                        <Button variant="outline" size="sm" className="w-full sm:w-auto">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1 sm:flex-none"
                        onClick={() => {
                          const newStock = prompt(`Update stock for ${product.name}:`, product.stock.toString())
                          if (newStock && !isNaN(parseInt(newStock))) {
                            handleQuickUpdate(product.id, parseInt(newStock), product.name)
                          }
                        }}
                      >
                        <Zap className="h-4 w-4 mr-1" />
                        Quick Update
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Info */}
      {stockData && stockData.pagination.totalProducts > stockData.pagination.limit && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Showing {filteredProducts.length} of {stockData.pagination.totalProducts} products
              </span>
              {stockData.pagination.hasMore && (
                <Button variant="outline" size="sm" onClick={fetchStockData}>
                  Load More
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  async function handleQuickUpdate(productId: string, newStock: number, productName: string) {
    try {
      const response = await fetch('/api/products/stock-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updates: [{ productId, stock: newStock }],
          reason: 'ADJUSTMENT_MANUAL',
          notes: `Quick update from stock management dashboard`
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Stock updated for ${productName}`)
        fetchStockData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update stock')
      }
    } catch (error) {
      console.error('Error updating stock:', error)
      toast.error('Failed to update stock')
    }
  }
}