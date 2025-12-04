/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
// app/(dashboard)/dashboard/page.tsx - Enhanced Version with All Improvements
'use client'

import { useEffect, useState, useMemo, memo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  DollarSign, ShoppingCart, Users, Package, 
  TrendingUp, TrendingDown, AlertCircle, Eye,
  BarChart3, PieChart, Calendar, RefreshCw,
  AlertTriangle, Plus, Star, Gift, Clock,
  FileText, RotateCcw, Archive, ArrowUpRight,
  Truck, CheckCircle, XCircle, Timer, Award,
  Tag, Building2, Layers, MessageSquare, Download,
  Filter, Search, X, Keyboard
} from 'lucide-react'
import { formatPrice, formatDate, ORDER_STATUS_COLORS } from '@/lib/utils'
import { StatsCard } from '@/components/admin/stats-card'
import { RevenueChart } from '@/components/admin/revenue-chart'
import { OrderStatusChart } from '@/components/admin/order-status-chart'
import { CustomerAnalytics } from '@/components/admin/customer-analytics'
import StockNotifications from '@/components/StockNotifications'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { DashboardData, CriticalAlert, getAlertColorClasses } from '@/lib/types/dashboard'
import React from 'react'

// Loading Skeleton Components
const StatCardSkeleton = memo(() => (
  <Card>
    <CardContent className="p-6">
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </CardContent>
  </Card>
))
StatCardSkeleton.displayName = 'StatCardSkeleton'

const ChartSkeleton = memo(() => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-40" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-64 w-full" />
    </CardContent>
  </Card>
))
ChartSkeleton.displayName = 'ChartSkeleton'

// Error Boundary Component
class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Dashboard Error:', error, errorInfo)
    toast.error('Dashboard Error', {
      description: 'Something went wrong. Please refresh the page.'
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50/50">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
              <p className="text-slate-600 mb-4">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <Button onClick={() => window.location.reload()} className="w-full">
                Reload Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Main Dashboard Component
export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // State Management
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)

  // Authentication Check
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      toast.error('Unauthorized access')
      router.push('/')
      return
    }
    
    fetchDashboardData()
  }, [session, status, router])

  // Auto-refresh Effect
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      fetchDashboardData(true)
    }, 60000) // Refresh every 60 seconds
    
    return () => clearInterval(interval)
  }, [autoRefresh])

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CMD/CTRL + R: Refresh
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault()
        fetchDashboardData()
      }
      // CMD/CTRL + K: Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.getElementById('dashboard-search')?.focus()
      }
      // CMD/CTRL + /: Show shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setShowKeyboardShortcuts(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Fetch Dashboard Data with Error Handling
  const fetchDashboardData = useCallback(async (silent = false) => {
    try {
      if (!silent) setRefreshing(true)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout
      
      const response = await fetch('/api/admin/dashboard', {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch dashboard data')
      }
      
      const dashboardData = await response.json()
      setData(dashboardData)
      setLastRefresh(new Date())
      
      if (!silent) {
        toast.success('Dashboard updated')
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          toast.error('Request timeout', {
            description: 'The request took too long. Please try again.'
          })
        } else {
          toast.error('Failed to load dashboard', {
            description: error.message
          })
        }
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Export Dashboard Data
  const exportDashboard = useCallback(() => {
    if (!data) return
    
    const exportData = {
      generatedAt: new Date().toISOString(),
      metrics: {
        revenue: data.totalRevenue,
        orders: data.totalOrders,
        customers: data.totalCustomers,
        products: data.totalProducts
      },
      growth: {
        monthlyGrowth: data.monthlyGrowth,
        monthlyRevenue: data.monthlyRevenue,
        weeklyRevenue: data.weeklyRevenue
      }
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dashboard-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    toast.success('Dashboard exported')
  }, [data])

  // Memoized Critical Alerts
  const criticalAlerts = useMemo<CriticalAlert[]>(() => {
    if (!data) return []
    
    return [
      ...(data.pendingOrders > 0 ? [{
        type: 'pending',
        count: data.pendingOrders,
        title: 'Pending Orders',
        description: 'Need processing',
        href: '/dashboard/orders?status=PENDING',
        color: 'yellow' as const,
        icon: Timer
      }] : []),
      ...(data.pendingRefunds > 0 ? [{
        type: 'refunds',
        count: data.pendingRefunds,
        title: 'Pending Refunds',
        description: 'Awaiting approval',
        href: '/dashboard/refunds?status=PENDING',
        color: 'purple' as const,
        icon: RotateCcw
      }] : []),
      ...(data.failedPayments > 0 ? [{
        type: 'payments',
        count: data.failedPayments,
        title: 'Failed Payments',
        description: 'Require attention',
        href: '/dashboard/orders?payment=FAILED',
        color: 'red' as const,
        icon: XCircle
      }] : []),
      ...(data.lowStockProducts > 0 ? [{
        type: 'lowStock',
        count: data.lowStockProducts,
        title: 'Low Stock Items',
        description: 'Running low on inventory',
        href: '/dashboard/products?stock=low',
        color: 'orange' as const,
        icon: AlertTriangle
      }] : []),
      ...(data.outOfStockProducts > 0 ? [{
        type: 'outOfStock',
        count: data.outOfStockProducts,
        title: 'Out of Stock',
        description: 'Products unavailable',
        href: '/dashboard/products?stock=out',
        color: 'red' as const,
        icon: Archive
      }] : []),
      ...(data.expiringSoonCoupons.length > 0 ? [{
        type: 'coupons',
        count: data.expiringSoonCoupons.length,
        title: 'Expiring Coupons',
        description: 'Expiring within 7 days',
        href: '/dashboard/coupons',
        color: 'blue' as const,
        icon: Gift
      }] : [])
    ]
  }, [data])

  // Filtered Recent Orders
  const filteredOrders = useMemo(() => {
    if (!data?.recentOrders || !searchQuery) return data?.recentOrders || []
    
    return data.recentOrders.filter(order => 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [data?.recentOrders, searchQuery])

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      </div>
    )
  }

  // Error State
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 bg-slate-50/50">
  <Card className="w-full max-w-sm sm:max-w-md md:max-w-lg">
    <CardContent className="pt-6 text-center">
      <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 mx-auto mb-4" />

      <h2 className="text-lg sm:text-xl font-semibold mb-2">
        Failed to load dashboard
      </h2>

      <p className="text-slate-600 mb-4 text-sm sm:text-base px-2">
        Unable to fetch dashboard data. Please try again.
      </p>

      <Button onClick={() => fetchDashboardData()} className="w-full flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4" />
        Try Again
      </Button>
    </CardContent>
  </Card>
</div>

    )
  }

  return (
    <DashboardErrorBoundary>
      <div className="min-h-screen bg-slate-50/50">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Header with Enhanced Controls */}
          <div className="flex flex-col gap-4">
  <div className="min-w-0">
    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 truncate">
      Dashboard Overview
    </h1>
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
      <p className="text-slate-600 text-sm sm:text-base">
        Welcome back! Here's what's happening with your store today.
      </p>
      {lastRefresh && (
        <span className="text-xs text-slate-400 whitespace-nowrap">
          Updated {formatDate(lastRefresh, 'relative')}
        </span>
      )}
    </div>
  </div>
  
  <div className="flex items-center gap-2 overflow-x-auto pb-1">
    <Button
      onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
      variant="ghost"
      size="sm"
      className="flex-shrink-0"
      title="Keyboard Shortcuts (Cmd/Ctrl + /)"
    >
      <Keyboard className="w-4 h-4" />
    </Button>
    
    <Button
      onClick={exportDashboard}
      variant="outline"
      size="sm"
      className="flex-shrink-0"
    >
      <Download className="w-4 h-4 sm:mr-2" />
      <span className="hidden sm:inline">Export</span>
    </Button>
    
    <Button
      onClick={() => setAutoRefresh(!autoRefresh)}
      variant={autoRefresh ? "default" : "outline"}
      size="sm"
      className="flex-shrink-0"
    >
      <Clock className="w-4 h-4 sm:mr-2" />
      <span className="hidden sm:inline">{autoRefresh ? 'Auto' : 'Manual'}</span>
    </Button>
    
    <Button
      onClick={() => fetchDashboardData()}
      disabled={refreshing}
      variant="outline"
      size="sm"
      className="flex-shrink-0"
    >
      <RefreshCw className={`w-4 h-4 sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
      <span className="hidden sm:inline">Refresh</span>
    </Button>
  </div>
</div>

          {/* Keyboard Shortcuts Modal */}
          {showKeyboardShortcuts && (
  <Card className="border-blue-200 bg-blue-50/50">
    <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 sm:px-6">
      <CardTitle className="text-sm sm:text-base">Keyboard Shortcuts</CardTitle>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowKeyboardShortcuts(false)}
        className="h-8 w-8 p-0"
      >
        <X className="w-4 h-4" />
      </Button>
    </CardHeader>
    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2 text-xs sm:text-sm px-4 sm:px-6">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <kbd className="px-1.5 sm:px-2 py-1 bg-white rounded border text-xs">⌘/Ctrl</kbd>
        <span>+</span>
        <kbd className="px-1.5 sm:px-2 py-1 bg-white rounded border text-xs">R</kbd>
        <span className="text-slate-600">Refresh</span>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <kbd className="px-1.5 sm:px-2 py-1 bg-white rounded border text-xs">⌘/Ctrl</kbd>
        <span>+</span>
        <kbd className="px-1.5 sm:px-2 py-1 bg-white rounded border text-xs">K</kbd>
        <span className="text-slate-600">Search</span>
      </div>
    </CardContent>
  </Card>
)}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <StatsCard
            title="Total Revenue"
            value={formatPrice(data.totalRevenue)}
            icon={DollarSign}
            trend={data.monthlyGrowth}
            trendLabel="vs last month"
            color="green"
          />
          <StatsCard
            title="Total Orders"
            value={data.totalOrders.toLocaleString()}
            icon={ShoppingCart}
            subtitle={`${data.paidOrders} paid`}
            color="blue"
          />
          <StatsCard
            title="Total Customers"
            value={data.totalCustomers.toLocaleString()}
            icon={Users}
            subtitle={`${data.newCustomersThisMonth} new this month`}
            color="purple"
          />
          <StatsCard
            title="Active Products"
            value={`${data.activeProducts}/${data.totalProducts}`}
            icon={Package}
            subtitle={`${data.featuredProducts} featured`}
            color="orange"
          />
        </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <StatsCard
              title="Monthly Revenue"
              value={formatPrice(data.monthlyRevenue)}
              icon={TrendingUp}
              trend={data.monthlyGrowth}
              trendLabel="vs last month"
              color="emerald"
            />
            <StatsCard
              title="Average Order Value"
              value={formatPrice(data.averageOrderValue)}
              icon={BarChart3}
              subtitle={`${data.conversionRate}% conversion`}
              color="indigo"
            />
            <StatsCard
              title="Weekly Revenue"
              value={formatPrice(data.weeklyRevenue)}
              icon={Calendar}
              subtitle={`${data.newCustomersThisWeek} new customers`}
              color="pink"
            />
            <StatsCard
              title="Reviews"
              value={data.totalReviews.toString()}
              icon={Star}
              subtitle={`${data.averageRating.toFixed(1)} avg rating`}
              color="amber"
            />
          </div>

          {/* Critical Alerts */}
          {criticalAlerts.length > 0 && (
  <Card className="border-amber-200 bg-amber-50/50">
    <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0" />
        <CardTitle className="text-base sm:text-lg text-amber-900 min-w-0 truncate">
          Critical Alerts
        </CardTitle>
        <Badge variant="secondary" className="ml-auto flex-shrink-0 text-xs">
          {criticalAlerts.reduce((sum, alert) => sum + alert.count, 0)} items
        </Badge>
      </div>
    </CardHeader>
    <CardContent className="px-4 sm:px-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {criticalAlerts.map((alert) => {
          const colorClasses = getAlertColorClasses(alert.color)
          return (
            <Link 
              key={alert.type}
              href={alert.href}
              className="group"
            >
              <Alert className={`transition-all duration-200 cursor-pointer hover:shadow-md ${colorClasses.border} ${colorClasses.bg}`}>
                <alert.icon className={`h-4 w-4 flex-shrink-0 ${colorClasses.icon}`} />
                <AlertDescription className="ml-2 min-w-0">
                  <div className={`font-medium text-sm sm:text-base ${colorClasses.text}`}>
                    {alert.count} {alert.title}
                  </div>
                  <div className={`text-xs sm:text-sm ${colorClasses.subtext} line-clamp-2`}>
                    {alert.description}
                  </div>
                </AlertDescription>
              </Alert>
            </Link>
          )
        })}
      </div>
    </CardContent>
  </Card>
)}

          {/* Order Status Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
                Order Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                <Link href="/dashboard/orders?status=PENDING" className="group">
                  <div className="text-center p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-200 transition-all hover:shadow-md hover:border-yellow-300">
                    <Timer className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-yellow-600 group-hover:scale-110 transition-transform" />
                    <div className="text-xl sm:text-2xl font-bold text-yellow-900">{data.pendingOrders}</div>
                    <div className="text-xs text-yellow-700">Pending</div>
                  </div>
                </Link>
                
                <Link href="/dashboard/orders?status=PROCESSING" className="group">
                  <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200 transition-all hover:shadow-md hover:border-blue-300">
                    <Package className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-blue-600 group-hover:scale-110 transition-transform" />
                    <div className="text-xl sm:text-2xl font-bold text-blue-900">{data.processingOrders}</div>
                    <div className="text-xs text-blue-700">Processing</div>
                  </div>
                </Link>
                
                <Link href="/dashboard/orders?status=SHIPPED" className="group">
                  <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-lg border border-purple-200 transition-all hover:shadow-md hover:border-purple-300">
                    <Truck className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-purple-600 group-hover:scale-110 transition-transform" />
                    <div className="text-xl sm:text-2xl font-bold text-purple-900">{data.shippedOrders}</div>
                    <div className="text-xs text-purple-700">Shipped</div>
                  </div>
                </Link>
                
                <Link href="/dashboard/orders?status=DELIVERED" className="group">
                  <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200 transition-all hover:shadow-md hover:border-green-300">
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-green-600 group-hover:scale-110 transition-transform" />
                    <div className="text-xl sm:text-2xl font-bold text-green-900">{data.deliveredOrders}</div>
                    <div className="text-xs text-green-700">Delivered</div>
                  </div>
                </Link>
                
                <Link href="/dashboard/orders?status=CANCELLED" className="group col-span-2 sm:col-span-1">
                  <div className="text-center p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200 transition-all hover:shadow-md hover:border-red-300">
                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2 text-red-600 group-hover:scale-110 transition-transform" />
                    <div className="text-xl sm:text-2xl font-bold text-red-900">{data.cancelledOrders}</div>
                    <div className="text-xs text-red-700">Cancelled</div>
                  </div>
                </Link>
              </div>
              
              {data.refundRate > 0 && (
                <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-600">Refund Rate</span>
                    <span className="font-medium text-slate-900">{data.refundRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs sm:text-sm">
                    <span className="text-slate-600">Total Refunded</span>
              
                    <span className="font-medium text-slate-900">{formatPrice(data.totalRefunded)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Charts Section */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-slate-600" />
                  Revenue Trend (30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueChart data={data.revenueChart} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-slate-600" />
                  Orders by Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OrderStatusChart data={data.ordersByStatus} />
              </CardContent>
            </Card>
          </div>

        {/* Top Performers Section - NEW */}
        <Tabs defaultValue="products" className="w-full">
  <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto sm:h-10">
    <TabsTrigger value="products" className="text-xs sm:text-sm px-2 py-2 sm:py-2.5">
      Top Products
    </TabsTrigger>
    <TabsTrigger value="customers" className="text-xs sm:text-sm px-2 py-2 sm:py-2.5">
      Top Customers
    </TabsTrigger>
    <TabsTrigger value="brands" className="text-xs sm:text-sm px-2 py-2 sm:py-2.5">
      Top Brands
    </TabsTrigger>
    <TabsTrigger value="categories" className="text-xs sm:text-sm px-2 py-2 sm:py-2.5">
      Top Categories
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="products">
    <Card>
      <CardHeader className="px-4 sm:px-6 pb-3 sm:pb-4">
        <CardTitle className="text-base sm:text-lg">Best Selling Products</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Products generating the most revenue</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <ScrollArea className="h-96">
          <div className="space-y-2 sm:space-y-3">
            {data.topSellingProducts.map((product: any, index: number) => (
              <div key={product.id} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                <div className="flex-shrink-0 text-sm sm:text-lg font-bold text-slate-400 w-5 sm:w-6 text-center">
                  {index + 1}
                </div>
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover  group-hover:scale-105 transition-transform duration-200"
                        onLoad={(e) => {
                          const img = e.currentTarget;
                          const canvas = document.createElement('canvas');
                          const ctx = canvas.getContext('2d');
                          
                          canvas.width = img.naturalWidth;
                          canvas.height = img.naturalHeight;
                          ctx?.drawImage(img, 0, 0);
                          
                          // Check corners for transparency/white background
                          const corners = [
                            ctx?.getImageData(0, 0, 1, 1).data,
                            ctx?.getImageData(canvas.width - 1, 0, 1, 1).data,
                            ctx?.getImageData(0, canvas.height - 1, 1, 1).data,
                            ctx?.getImageData(canvas.width - 1, canvas.height - 1, 1, 1).data,
                          ];
                          
                          const hasTransparentBg = corners.some(pixel => pixel && pixel[3] < 255);
                          const hasWhiteBg = corners.every(pixel => 
                            pixel && pixel[0] > 240 && pixel[1] > 240 && pixel[2] > 240
                          );
                          
                          if (hasTransparentBg || hasWhiteBg) {
                            img.style.objectFit = 'contain';
                            img.style.padding = '8px';
                          } else {
                            img.style.objectFit = 'cover';
                            img.style.padding = '0';
                          }
                        }}
                      />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-xs sm:text-sm line-clamp-2 mb-1" title={product.name}>
                    {product.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-slate-500">
                    {product.brand && (
                      <span className="px-1.5 sm:px-2 py-0.5 bg-slate-100 rounded truncate max-w-[80px] sm:max-w-[100px]" title={product.brand.name}>
                        {product.brand.name}
                      </span>
                    )}
                    {product.category && (
                      <span className="px-1.5 sm:px-2 py-0.5 bg-blue-50 text-blue-700 rounded truncate max-w-[80px] sm:max-w-[100px]" title={product.category.name}>
                        {product.category.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm whitespace-nowrap">{product.totalSold} sold</p>
                  <p className="text-[10px] sm:text-xs text-slate-500 whitespace-nowrap">{formatPrice(product.totalRevenue)}</p>
                  <Badge 
                    variant={product.stock === 0 ? "destructive" : product.stock <= 10 ? "secondary" : "outline"} 
                    className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs"
                  >
                    {product.stock} stock
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  </TabsContent>

  <TabsContent value="customers">
    <Card>
      <CardHeader className="px-4 sm:px-6 pb-3 sm:pb-4">
        <CardTitle className="text-base sm:text-lg">Top Customers</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Customers who spent the most</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <ScrollArea className="h-96">
          <div className="space-y-2 sm:space-y-4">
            {data.topCustomers.map((customer: any, index: number) => (
              <div key={customer.id} className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex-shrink-0 text-sm sm:text-lg font-bold text-slate-400 w-6 sm:w-8">
                  #{index + 1}
                </div>
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                  <AvatarImage src={customer.image} />
                  <AvatarFallback>{customer.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-xs sm:text-base truncate">{customer.name || 'Unknown'}</p>
                  <p className="text-xs sm:text-sm text-slate-500 truncate">{customer.email}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-slate-900 text-xs sm:text-base whitespace-nowrap">{formatPrice(customer.totalSpent)}</p>
                  <p className="text-[10px] sm:text-sm text-slate-500 whitespace-nowrap">{customer.totalOrders} orders</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  </TabsContent>

  <TabsContent value="brands">
    <Card>
      <CardHeader className="px-4 sm:px-6 pb-3 sm:pb-4">
        <CardTitle className="text-base sm:text-lg">Top Brands</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Brands with most sales</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <ScrollArea className="h-96">
          <div className="space-y-2 sm:space-y-4">
            {data.topBrands.map((brand: any, index: number) => (
              <div key={brand.id} className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex-shrink-0 text-sm sm:text-lg font-bold text-slate-400 w-6 sm:w-8">
                  #{index + 1}
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {brand.logo ? (
                    <img src={brand.logo} alt={brand.name} className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-xs sm:text-base truncate">{brand.name}</p>
                  <p className="text-xs sm:text-sm text-slate-500">{brand.productCount} products</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-slate-900 text-xs sm:text-base whitespace-nowrap">{brand.totalSales}</p>
                  <p className="text-[10px] sm:text-sm text-slate-500 whitespace-nowrap">total sales</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  </TabsContent>

  <TabsContent value="categories">
    <Card>
      <CardHeader className="px-4 sm:px-6 pb-3 sm:pb-4">
        <CardTitle className="text-base sm:text-lg">Top Categories</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Most popular product categories</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <ScrollArea className="h-96">
          <div className="space-y-2 sm:space-y-4">
            {data.topCategories.map((category: any, index: number) => (
              <div key={category.id} className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex-shrink-0 text-sm sm:text-lg font-bold text-slate-400 w-6 sm:w-8">
                  #{index + 1}
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {category.image ? (
                    <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
                  ) : (
                    <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-xs sm:text-base truncate">{category.name}</p>
                  <p className="text-xs sm:text-sm text-slate-500">{category.productCount} products</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-slate-900 text-xs sm:text-base whitespace-nowrap">{category.totalSales}</p>
                  <p className="text-[10px] sm:text-sm text-slate-500 whitespace-nowrap">total sales</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* Recent Inventory Changes */}
        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 rounded-xl sm:rounded-2xl bg-white/80 backdrop-blur">
          <CardHeader className="flex items-center justify-between border-b border-slate-100 pb-3 px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-slate-800 text-base sm:text-lg font-semibold">
              <Archive className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
              Recent Inventory Changes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              <div className="divide-y divide-slate-100">
                {data.recentInventoryChanges.map((log: any) => (
                  <div
                    key={log.id}
                    className="p-3 sm:p-4 hover:bg-indigo-50/40 transition-colors duration-200 flex items-start gap-2 sm:gap-3"
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-lg sm:rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                      {log.product.images?.[0] && (
                        <img
                          src={log.product.images[0]}
                          className="w-full h-full object-contain p-1.5 sm:p-2 group-hover:scale-105 transition-transform duration-200"
                          onLoad={(e) => {
                            const img = e.currentTarget;
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            
                            canvas.width = img.naturalWidth;
                            canvas.height = img.naturalHeight;
                            ctx?.drawImage(img, 0, 0);
                            
                            const corners = [
                              ctx?.getImageData(0, 0, 1, 1).data,
                              ctx?.getImageData(canvas.width - 1, 0, 1, 1).data,
                              ctx?.getImageData(0, canvas.height - 1, 1, 1).data,
                              ctx?.getImageData(canvas.width - 1, canvas.height - 1, 1, 1).data,
                            ];
                            
                            const hasTransparentBg = corners.some(pixel => pixel && pixel[3] < 255);
                            const hasWhiteBg = corners.every(pixel => 
                              pixel && pixel[0] > 240 && pixel[1] > 240 && pixel[2] > 240
                            );
                            
                            if (hasTransparentBg || hasWhiteBg) {
                              img.style.objectFit = 'contain';
                              img.style.padding = '8px';
                            } else {
                              img.style.objectFit = 'cover';
                              img.style.padding = '0';
                            }
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 break-words text-xs sm:text-sm leading-snug line-clamp-2">
                        {log.product.name}
                      </p>
                      {log.variant && (
                        <p className="text-[10px] sm:text-xs text-slate-500 truncate">{log.variant.name}</p>
                      )}
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                        <Badge
                          variant={log.changeAmount > 0 ? 'default' : 'secondary'}
                          className={`text-[10px] sm:text-xs rounded-full ${
                            log.changeAmount > 0
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {log.changeAmount > 0 ? '+' : ''}
                          {log.changeAmount}
                        </Badge>
                        <span className="text-[10px] sm:text-xs text-slate-500 truncate">{log.reason}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs sm:text-sm font-semibold text-slate-800 whitespace-nowrap">
                        {log.newStock} stock
                      </p>
                      <p className="text-[10px] sm:text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(log.createdAt, 'short')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 rounded-xl sm:rounded-2xl bg-white/80 backdrop-blur">
          <CardHeader className="flex items-center justify-between border-b border-slate-100 pb-3 px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-slate-800 text-base sm:text-lg font-semibold">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-500" />
              Recent Reviews
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              <div className="divide-y divide-slate-100">
                {data.recentReviews.map((review: any) => (
                  <div
                    key={review.id}
                    className="p-3 sm:p-4 hover:bg-amber-50/40 transition-colors duration-200 flex items-start gap-2 sm:gap-3"
                  >
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border border-slate-200 shadow-sm flex-shrink-0">
                      <AvatarImage src={review.user.image} />
                      <AvatarFallback className="bg-slate-100 text-slate-700 text-xs sm:text-sm">
                        {review.user.name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <p className="font-medium text-slate-900 text-xs sm:text-sm break-words line-clamp-1">
                          {review.user.name}
                        </p>
                        <div className="flex">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star
                              key={i}
                              className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-400"
                            />
                          ))}
                        </div>
                      </div>
                      <p
                        className="text-xs sm:text-sm text-slate-600 mt-1 break-words line-clamp-1"
                        title={review.product.name}
                      >
                        {review.product.name}
                      </p>
                      {review.comment && (
                        <p
                          className="text-xs sm:text-sm text-slate-500 mt-1 italic break-words line-clamp-2"
                          title={review.comment}
                        >
                          "{review.comment}"
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] sm:text-xs text-slate-400 whitespace-nowrap">
                        {formatDate(review.createdAt, 'short')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>


        {/* Refunds & Notes Section - NEW */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-3 lg:gap-8">
  {/* Recent Refunds */}
  {data.recentRefunds.length > 0 && (
    <Card>
      <CardHeader className="px-4 sm:px-6 pb-3 sm:pb-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
          Recent Refunds
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-200">
          {data.recentRefunds.map((refund: any) => (
            <div key={refund.id} className="p-3 sm:p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-xs sm:text-sm">
                    Order #{refund.order.orderNumber}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500 truncate">
                    Requested by {refund.requestedByUser.name}
                  </p>
                  {refund.reason && (
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-1 line-clamp-1">{refund.reason}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-medium text-slate-900 text-xs sm:text-base whitespace-nowrap">{formatPrice(refund.amount)}</p>
                  <Badge 
                    variant={
                      refund.status === 'PENDING' ? 'secondary' :
                      refund.status === 'APPROVED' ? 'default' :
                      refund.status === 'PROCESSED' ? 'outline' :
                      'destructive'
                    }
                    className="mt-1 text-[10px] sm:text-xs"
                  >
                    {refund.status}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )}

  {/* Recent Order Notes */}
  {data.recentOrderNotes.length > 0 && (
    <Card>
      <CardHeader className="px-4 sm:px-6 pb-3 sm:pb-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
          Recent Order Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-200">
          {data.recentOrderNotes.map((note: any) => (
            <div key={note.id} className="p-3 sm:p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start gap-2 sm:gap-3">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <p className="font-medium text-slate-900 text-xs sm:text-sm">
                      Order #{note.order.orderNumber}
                    </p>
                    {note.isInternal && (
                      <Badge variant="outline" className="text-[10px] sm:text-xs">Internal</Badge>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1 line-clamp-2">{note.content}</p>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                    <p className="text-[10px] sm:text-xs text-slate-500">by {note.author.name}</p>
                    <span className="text-slate-300 hidden sm:inline">•</span>
                    <p className="text-[10px] sm:text-xs text-slate-500">{formatDate(note.createdAt, 'short')}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )}
</div>

        {/* Analytics & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <CustomerAnalytics />
          
          {/* Quick Actions & Active Coupons Combined */}
          <div className="space-y-6">
            {/* Quick Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Link href="/dashboard/products/new" className="group">
                    <div className="flex flex-col items-center justify-center p-4 sm:p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200">
                      <Package className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 group-hover:text-blue-500 mb-2 transition-colors" />
                      <p className="text-xs sm:text-sm font-medium text-slate-700 group-hover:text-blue-700 text-center transition-colors">
                        Add Product
                      </p>
                    </div>
                  </Link>
                  
                  <Link href="/dashboard/products/stock" className="group">
                    <div className="flex flex-col items-center justify-center p-4 sm:p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all duration-200">
                      <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 group-hover:text-orange-500 mb-2 transition-colors" />
                      <p className="text-xs sm:text-sm font-medium text-slate-700 group-hover:text-orange-700 text-center transition-colors">
                        Manage Stock
                      </p>
                    </div>
                  </Link>
                  
                  <Link href="/dashboard/orders" className="group">
                    <div className="flex flex-col items-center justify-center p-4 sm:p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all duration-200">
                      <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 group-hover:text-green-500 mb-2 transition-colors" />
                      <p className="text-xs sm:text-sm font-medium text-slate-700 group-hover:text-green-700 text-center transition-colors">
                        View Orders
                      </p>
                    </div>
                  </Link>
                  
                  <Link href="/dashboard/coupons/new" className="group">
                    <div className="flex flex-col items-center justify-center p-4 sm:p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all duration-200">
                      <Gift className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 group-hover:text-purple-500 mb-2 transition-colors" />
                      <p className="text-xs sm:text-sm font-medium text-slate-700 group-hover:text-purple-700 text-center transition-colors">
                        Create Coupon
                      </p>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Active Coupons Summary */}
            {data.activeCoupons > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-slate-600" />
                      Active Coupons
                    </CardTitle>
                    <Badge variant="default">{data.activeCoupons} active</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {data.expiringSoonCoupons.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-700 mb-3">Expiring Soon</p>
                      {data.expiringSoonCoupons.map((coupon: any) => (
                        <div key={coupon.code} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div>
                            <p className="font-mono font-medium text-slate-900">{coupon.code}</p>
                            <p className="text-xs text-slate-500">
                              {coupon.usedCount} / {coupon.maxUses || '∞'} used
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-amber-600">
                              <Clock className="w-3 h-3" />
                              <p className="text-xs font-medium">
                                {formatDate(coupon.expiresAt, 'short')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" asChild className="w-full mt-2">
                        <Link href="/dashboard/coupons">View All Coupons</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Stock Notifications */}
          <div className="xl:col-span-1">
            <StockNotifications maxItems={8} showTitle={true} className="h-full" />
          </div>
        </div>

        {/* Order Sources & Payment Providers - NEW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-slate-600" />
                Order Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.orderSourceStats.map((source: any) => {
                  const total = data.orderSourceStats.reduce((sum: number, s: any) => sum + s._count.id, 0)
                  const percentage = ((source._count.id / total) * 100).toFixed(1)
                  return (
                    <div key={source.source} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          source.source === 'WEBSITE' ? 'bg-blue-500' :
                          source.source === 'MOBILE_APP' ? 'bg-purple-500' :
                          'bg-green-500'
                        }`} />
                        <span className="text-sm text-slate-700">{source.source.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-900">{source._count.id}</span>
                        <span className="text-xs text-slate-500 w-12 text-right">{percentage}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-slate-600" />
                Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.paymentProviderStats.map((provider: any) => {
                  const total = data.paymentProviderStats.reduce((sum: number, p: any) => sum + p._count.id, 0)
                  const percentage = ((provider._count.id / total) * 100).toFixed(1)
                  return (
                    <div key={provider.paymentProvider} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          provider.paymentProvider === 'STRIPE' ? 'bg-indigo-500' :
                          provider.paymentProvider === 'PAYPAL' ? 'bg-blue-500' :
                          'bg-green-500'
                        }`} />
                        <span className="text-sm text-slate-700">{provider.paymentProvider}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-900">{provider._count.id}</span>
                        <span className="text-xs text-slate-500 w-12 text-right">{percentage}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              {data.failedPayments > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-700">Failed Payments</span>
                    <Badge variant="destructive">{data.failedPayments}</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tables Section - Recent Orders */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent Orders</CardTitle>
            <div className="flex items-center gap-3">
              {data.pendingOrders > 0 && (
                <Badge variant="destructive">
                  {data.pendingOrders} pending
                </Badge>
              )}
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/orders">
                  View All
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
              {data.recentOrders.map((order: any) => (
                <div key={order.id} className="p-4 sm:p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={order.user.image} />
                          <AvatarFallback>{order.user.name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-slate-900 text-sm">
                            #{order.orderNumber}
                          </p>
                          <p className="text-sm text-slate-500 truncate">
                            {order.user.name || order.user.email}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {order._count.notes > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {order._count.notes} notes
                              </Badge>
                            )}
                            {order._count.refunds > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {order._count.refunds} refunds
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 flex-shrink-0">
                      <div className="flex flex-col gap-1">
                        <Badge className={ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS]}>
                          {order.status}
                        </Badge>
                        <Badge variant={order.paymentStatus === 'PAID' ? 'default' : 'secondary'} className="text-xs">
                          {order.paymentStatus}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-slate-900 text-sm">
                          {formatPrice(order.total)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(order.createdAt, 'short')}
                        </p>
                        <p className="text-xs text-slate-500">
                          via {order.source.replace('_', ' ')}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/orders/${order.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {data.recentOrders.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No recent orders</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </DashboardErrorBoundary>
  )
}