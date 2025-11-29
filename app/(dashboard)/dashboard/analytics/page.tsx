/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(dashboard)/analytics/page.tsx - Enhanced Analytics Dashboard
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  Calendar,
  Target,
  AlertCircle,
  Download,
  Eye,
  EyeOff,
  Loader2,
  BarChart3
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'

interface OverviewData {
  overview: {
    revenue: { current: number; previous: number; change: number }
    orders: { current: number; previous: number; change: number }
    customers: { current: number; previous: number; change: number }
    avgOrderValue: number
  }
  topProducts: Array<{
    id: string
    name: string
    slug: string
    price: number
    images: string[]
    category: { name: string } | null
    totalSold: number
    orderCount: number
  }>
  recentOrders: Array<{
    id: string
    orderNumber: string
    total: number
    status: string
    createdAt: string
    user: { name: string; email: string }
    items: Array<{ product: { name: string } }>
  }>
}

interface SalesData {
  salesTimeline: Array<{
    period: string
    orders: number
    revenue: number
    customers: number
  }>
  salesByCategory: Array<{
    category: string | null
    quantity: number
    revenue: number
  }>
  conversionFunnel: {
    visitors: number
    cartUsers: number
    orderUsers: number
    paidUsers: number
  }
}

interface CustomerData {
  segments: Array<{
    segment: string
    customers: number
    avg_spent: number
    total_revenue: number
  }>
  topCustomers: Array<{
    id: string
    name: string
    email: string
    createdAt: string
    orders: number
    total_spent: number
    avg_order_value: number
    last_order: string
  }>
  acquisition: Array<{
    date: string
    new_customers: number
  }>
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

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

export default function AnalyticsPage() {
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null)
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [customerData, setCustomerData] = useState<CustomerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('30')
  const [activeTab, setActiveTab] = useState('overview')
  const [hiddenMetrics, setHiddenMetrics] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      fetchAnalyticsData()
      toast.success('Dashboard refreshed automatically')
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [autoRefresh, period])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault()
        fetchAnalyticsData()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault()
        handleExport()
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [period, overviewData])

  useEffect(() => {
    fetchAnalyticsData()
  }, [period])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const overviewRes = await fetch(`/api/analytics/overview?period=${period}`)
      if (overviewRes.ok) {
        const overview = await overviewRes.json()
        setOverviewData(overview)
      } else {
        const errorData = await overviewRes.json()
        throw new Error(errorData.details || errorData.error || 'Failed to fetch overview data')
      }

      try {
        const salesRes = await fetch(`/api/analytics/sales?period=${period}&groupBy=${period === '7' ? 'day' : period === '30' ? 'day' : 'week'}`)
        if (salesRes.ok) {
          const sales = await salesRes.json()
          setSalesData(sales)
        } else {
          setSalesData({
            salesTimeline: [],
            salesByCategory: [],
            conversionFunnel: { visitors: 0, cartUsers: 0, orderUsers: 0, paidUsers: 0 }
          })
        }
      } catch (salesError) {
        console.log('Sales API error (non-critical):', salesError)
        setSalesData({
          salesTimeline: [],
          salesByCategory: [],
          conversionFunnel: { visitors: 0, cartUsers: 0, orderUsers: 0, paidUsers: 0 }
        })
      }

      try {
        const customerRes = await fetch(`/api/analytics/customers?period=${period}`)
        if (customerRes.ok) {
          const customers = await customerRes.json()
          setCustomerData(customers)
        } else {
          setCustomerData({
            segments: [],
            topCustomers: [],
            acquisition: []
          })
        }
      } catch (customerError) {
        console.log('Customer API error (non-critical):', customerError)
        setCustomerData({
          segments: [],
          topCustomers: [],
          acquisition: []
        })
      }

      toast.success('Analytics data refreshed')
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch analytics data')
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!overviewData) {
      toast.error('No data to export')
      return
    }
    setIsExporting(true)
    try {
      const exportData = {
        period: period,
        exportDate: new Date().toISOString(),
        overview: overviewData.overview,
        topProducts: overviewData.topProducts,
        recentOrders: overviewData.recentOrders.map(o => ({
          orderNumber: o.orderNumber,
          total: o.total,
          status: o.status,
          customer: o.user.name,
          date: o.createdAt
        })),
        sales: salesData,
        customers: customerData
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-${period}days-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Analytics data exported successfully')
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(value)
  }

  const formatPercent = (value: number) => {
    if (!isFinite(value)) return '0%'
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getChangeIcon = (change: number) => {
    return change >= 0 ? (
      <ArrowUpRight className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDownRight className="h-4 w-4 text-red-600" />
    )
  }

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600'
  }

  const insights = useMemo(() => {
    if (!overviewData) return []
    const insights: Array<{ type: 'success' | 'warning' | 'info'; message: string }> = []
    if (overviewData.overview.revenue.change > 20) {
      insights.push({ type: 'success', message: `Revenue increased by ${overviewData.overview.revenue.change.toFixed(1)}%! 🎉` })
    } else if (overviewData.overview.revenue.change < -10) {
      insights.push({ type: 'warning', message: `Revenue decreased by ${Math.abs(overviewData.overview.revenue.change).toFixed(1)}%. Consider promotions.` })
    }
    if (overviewData.overview.customers.change > 30) {
      insights.push({ type: 'success', message: 'Strong customer acquisition growth!' })
    } else if (overviewData.overview.customers.change < -15) {
      insights.push({ type: 'warning', message: 'Customer acquisition is slowing. Review marketing efforts.' })
    }
    if (overviewData.overview.avgOrderValue > 100) {
      insights.push({ type: 'info', message: 'High average order value maintained!' })
    }
    return insights
  }, [overviewData])

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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-80 w-full" />
              </CardContent>
            </Card>
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
          <AlertTitle>Failed to load analytics data</AlertTitle>
          <AlertDescription>
            <p className="text-sm text-gray-600 mb-3">{error}</p>
            <div className="flex gap-2">
              <Button onClick={fetchAnalyticsData} variant="outline" size="sm">
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
            <BarChart3 className="h-7 w-7 text-blue-600" />
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Track your business performance and make data-driven decisions
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
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
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
          <Button onClick={fetchAnalyticsData} variant="outline" size="sm">
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
      {overviewData && (
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
                  setHiddenMetrics(new Set(['revenue', 'orders', 'customers', 'aov']))
                }
              }}
            >
              {hiddenMetrics.size > 0 ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {!hiddenMetrics.has('revenue') && (
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => toggleMetric('revenue')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold">
                    {formatCurrency(overviewData.overview.revenue.current)}
                  </div>
                  <div className={`flex items-center text-xs ${getChangeColor(overviewData.overview.revenue.change)}`}>
                    {getChangeIcon(overviewData.overview.revenue.change)}
                    <span className="ml-1">
                      {formatPercent(overviewData.overview.revenue.change)} from last period
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {!hiddenMetrics.has('orders') && (
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => toggleMetric('orders')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold">
                    {overviewData.overview.orders.current.toLocaleString()}
                  </div>
                  <div className={`flex items-center text-xs ${getChangeColor(overviewData.overview.orders.change)}`}>
                    {getChangeIcon(overviewData.overview.orders.change)}
                    <span className="ml-1">
                      {formatPercent(overviewData.overview.orders.change)} from last period
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {!hiddenMetrics.has('customers') && (
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => toggleMetric('customers')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">New Customers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold">
                    {overviewData.overview.customers.current.toLocaleString()}
                  </div>
                  <div className={`flex items-center text-xs ${getChangeColor(overviewData.overview.customers.change)}`}>
                    {getChangeIcon(overviewData.overview.customers.change)}
                    <span className="ml-1">
                      {formatPercent(overviewData.overview.customers.change)} from last period
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {!hiddenMetrics.has('aov') && (
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => toggleMetric('aov')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold">
                    {formatCurrency(overviewData.overview.avgOrderValue)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Per completed order
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full overflow-x-auto sm:grid sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-0">
          <TabsTrigger value="overview" className="flex-1 whitespace-nowrap">Overview</TabsTrigger>
          <TabsTrigger value="sales" className="flex-1 whitespace-nowrap">Sales</TabsTrigger>
          <TabsTrigger value="products" className="flex-1 whitespace-nowrap">Products</TabsTrigger>
          <TabsTrigger value="customers" className="flex-1 whitespace-nowrap">Customers</TabsTrigger>
        </TabsList>

        <div className="mt-4 sm:mt-6">
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
              {/* Revenue Over Time */}
              {salesData && salesData.salesTimeline.length > 0 ? (
                <Card className="xl:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl">Revenue Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 md:h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesData.salesTimeline}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="period" 
                            tickFormatter={(value) => new Date(value).toLocaleDateString()}
                            fontSize={12}
                          />
                          <YAxis tickFormatter={(value) => `$${value}`} fontSize={12} />
                          <Tooltip 
                            formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                            labelFormatter={(value) => new Date(value).toLocaleDateString()}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#3b82f6" 
                            fillOpacity={1} 
                            fill="url(#colorRevenue)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="xl:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl">Revenue Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 md:h-80 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-sm md:text-base">No sales data available for this period</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Top Products */}
              {overviewData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl">Top Selling Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {overviewData.topProducts.length > 0 ? (
                      <div className="space-y-4">
                        {overviewData.topProducts.slice(0, 5).map((product, index) => (
                          <div key={product.id} className="flex items-center gap-3 md:gap-4">
                            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs md:text-sm font-semibold text-blue-600">
                              {index + 1}
                            </div>
                            <div className="w-10 h-10 md:w-12 md:h-12 relative flex-shrink-0">
                              <Image
                                src={product.images[0] || '/placeholder.png'}
                                alt={product.name}
                                fill
                                className="object-cover rounded"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate text-sm md:text-base">{product.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {product.totalSold} sold
                                </Badge>
                                {product.category && (
                                  <span className="text-xs text-gray-500 hidden sm:inline">
                                    {product.category.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-sm md:text-base">
                                {formatCurrency(product.price)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-sm md:text-base">No product sales in this period</p>
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t">
                      <Link href="/analytics/products">
                        <Button variant="outline" className="w-full text-sm">
                          View All Product Analytics
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Orders */}
              {overviewData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl">Recent Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {overviewData.recentOrders.length > 0 ? (
                      <div className="space-y-4">
                        {overviewData.recentOrders.slice(0, 5).map((order) => (
                          <div key={order.id} className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm md:text-base">#{order.orderNumber}</p>
                              <p className="text-xs md:text-sm text-gray-600">{order.user.name}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-sm md:text-base">{formatCurrency(order.total)}</p>
                              <Badge 
                                variant={order.status === 'DELIVERED' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {order.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-sm md:text-base">No orders in this period</p>
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t">
                      <Link href="/dashboard/orders">
                        <Button variant="outline" className="w-full text-sm">
                          View All Orders
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-6">
            {salesData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Sales by Category */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl">Sales by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {salesData.salesByCategory.length > 0 ? (
                      <div className="h-64 md:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={salesData.salesByCategory}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }: { name?: string; percent?: number }) =>
                                `${name || 'Uncategorized'} ${(percent! * 100).toFixed(0)}%`
                              }
                              fill="#8884d8"
                              dataKey="revenue"
                            >
                              {salesData.salesByCategory.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => [formatCurrency(value), 'Revenue']} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 md:h-80 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-sm md:text-base">No category data available</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Conversion Funnel */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl">Conversion Funnel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 md:space-y-4">
                      <div className="flex items-center justify-between p-3 md:p-4 bg-blue-50 rounded-lg">
                        <span className="font-medium text-sm md:text-base">New Visitors</span>
                        <span className="text-xl md:text-2xl font-bold text-blue-600">
                          {salesData.conversionFunnel.visitors}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 md:p-4 bg-green-50 rounded-lg">
                        <span className="font-medium text-sm md:text-base">Added to Cart</span>
                        <div className="text-right">
                          <span className="text-xl md:text-2xl font-bold text-green-600">
                            {salesData.conversionFunnel.cartUsers}
                          </span>
                          <div className="text-xs md:text-sm text-gray-600">
                            {salesData.conversionFunnel.visitors > 0 
                              ? ((salesData.conversionFunnel.cartUsers / salesData.conversionFunnel.visitors) * 100).toFixed(1)
                              : 0}%
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 md:p-4 bg-yellow-50 rounded-lg">
                        <span className="font-medium text-sm md:text-base">Placed Order</span>
                        <div className="text-right">
                          <span className="text-xl md:text-2xl font-bold text-yellow-600">
                            {salesData.conversionFunnel.orderUsers}
                          </span>
                          <div className="text-xs md:text-sm text-gray-600">
                            {salesData.conversionFunnel.cartUsers > 0
                              ? ((salesData.conversionFunnel.orderUsers / salesData.conversionFunnel.cartUsers) * 100).toFixed(1)
                              : 0}%
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 md:p-4 bg-purple-50 rounded-lg">
                        <span className="font-medium text-sm md:text-base">Completed Payment</span>
                        <div className="text-right">
                          <span className="text-xl md:text-2xl font-bold text-purple-600">
                            {salesData.conversionFunnel.paidUsers}
                          </span>
                          <div className="text-xs md:text-sm text-gray-600">
                            {salesData.conversionFunnel.orderUsers > 0
                              ? ((salesData.conversionFunnel.paidUsers / salesData.conversionFunnel.orderUsers) * 100).toFixed(1)
                              : 0}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <ProductAnalytics period={period} />
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers">
            <CustomerAnalytics period={period} customerData={customerData} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

// Product Analytics Component
function ProductAnalytics({ period }: { period: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProductAnalytics()
  }, [period])

  const fetchProductAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics/products?period=${period}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Error fetching product analytics:', error)
      toast.error('Failed to load product analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(5)].map((_, j) => (
                    <Skeleton key={j} className="h-16 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Top Performing Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Top Performing Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.productPerformance?.length > 0 ? (
              <div className="space-y-4">
                {data.productPerformance.slice(0, 10).map((product: any, index: number) => (
                  <div key={product.id} className="flex items-center gap-3 md:gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-xs font-semibold text-green-600 flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="w-10 h-10 relative flex-shrink-0">
                      <Image
                        src={product.images?.[0] || '/placeholder.png'}
                        alt={product.name}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm md:text-base">{product.name}</p>
                      <p className="text-xs md:text-sm text-gray-600">{product.category || 'Uncategorized'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm md:text-base">{product.sold} sold</p>
                      <p className="text-xs md:text-sm text-gray-600">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(product.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm md:text-base">No product data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Performing Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Low Performing Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.lowPerformingProducts?.length > 0 ? (
              <div className="space-y-4">
                {data.lowPerformingProducts.slice(0, 10).map((product: any) => (
                  <div key={product.id} className="flex items-center gap-3 md:gap-4 p-3 bg-red-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm md:text-base">{product.name}</p>
                      <p className="text-xs md:text-sm text-gray-600">{product.category || 'Uncategorized'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600">{product.stock} in stock</p>
                      <p className="text-xs md:text-sm text-gray-600">{product.sold} sold</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm md:text-base">No low performing products found!</p>
                <p className="text-xs md:text-sm">All products are selling well.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Enhanced Customer Analytics Component
function CustomerAnalytics({ period, customerData }: { period: string; customerData: CustomerData | null }) {
  const [loading, setLoading] = useState(false)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(value)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-80 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!customerData) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-sm md:text-base">Customer data is not available</p>
        <p className="text-xs md:text-sm">Please check your customer analytics API</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Customer Segments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Customer Segments</CardTitle>
          </CardHeader>
          <CardContent>
            {customerData.segments.length > 0 ? (
              <div className="space-y-4">
                {customerData.segments.map((segment) => (
                  <div key={segment.segment} className="p-3 md:p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-sm md:text-base">{segment.segment} Customers</h3>
                      <Badge variant={
                        segment.segment === 'VIP' ? 'default' : 
                        segment.segment === 'Loyal' ? 'secondary' : 'outline'
                      } className="text-xs">
                        {segment.customers} customers
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 text-xs md:text-sm">Avg Spent</p>
                        <p className="font-medium text-sm md:text-base">{formatCurrency(segment.avg_spent)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs md:text-sm">Total Revenue</p>
                        <p className="font-medium text-sm md:text-base">{formatCurrency(segment.total_revenue)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm md:text-base">No customer segments available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Acquisition */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Customer Acquisition</CardTitle>
          </CardHeader>
          <CardContent>
            {customerData.acquisition.length > 0 ? (
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={customerData.acquisition}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip 
                      formatter={(value: number) => [value, 'New Customers']}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Bar dataKey="new_customers" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 md:h-80 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm md:text-base">No acquisition data available</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Top Customers</CardTitle>
        </CardHeader>
        <CardContent>
          {customerData.topCustomers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Avg Order</th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Last Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {customerData.topCustomers.slice(0, 10).map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-3 md:px-4 py-4">
                        <div>
                          <p className="font-medium text-sm md:text-base">{customer.name}</p>
                          <p className="text-xs md:text-sm text-gray-600 truncate max-w-[150px] md:max-w-none">{customer.email}</p>
                        </div>
                      </td>
                      <td className="px-3 md:px-4 py-4 text-sm">{customer.orders}</td>
                      <td className="px-3 md:px-4 py-4 text-sm font-medium">{formatCurrency(customer.total_spent)}</td>
                      <td className="px-3 md:px-4 py-4 text-sm hidden sm:table-cell">{formatCurrency(customer.avg_order_value)}</td>
                      <td className="px-3 md:px-4 py-4 text-sm hidden md:table-cell">
                        {new Date(customer.last_order).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm md:text-base">No customer data available</p>
              <p className="text-xs md:text-sm">Customers will appear here once they make purchases</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}