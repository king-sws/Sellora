/* eslint-disable react/no-unescaped-entities */
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  CheckCircle, ArrowLeft, AlertCircle, RefreshCw,
  Eye, User, Calendar, Star, MessageSquare, Package,
  TrendingUp, DollarSign, ChevronDown, Mail, Phone,
  BarChart3, Download, Filter, Search, X, Printer,
  Award, ThumbsUp, ThumbsDown, Clock, PackageCheck
} from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

interface Order {
  id: string
  orderNumber: string
  user: {
    id: string
    name: string | null
    email: string | null
    phone?: string | null
  }
  total: number
  status: string
  paymentStatus: string
  createdAt: string
  updatedAt: string
  deliveredAt?: string
  items: Array<{
    id: string
    quantity: number
    product: {
      id: string
      name: string
      price: number
    }
  }>
  trackingNumber?: string
  carrier?: string
  customerRating?: number
  customerFeedback?: string
  refundEligible?: boolean
  refundDeadline?: string
}

interface DeliveryStats {
  today: number
  thisWeek: number
  thisMonth: number
  totalRevenue: number
  averageOrderValue: number
  totalOrders: number
  averageRating: number
  reviewedOrders: number
}

export default function DeliveredOrdersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<Set<string>>(new Set())
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [timeFilter, setTimeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('deliveredAt')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [refundFilter, setRefundFilter] = useState('all')
  const [stats, setStats] = useState<DeliveryStats | null>(null)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault()
        fetchDeliveredOrders()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        toggleSelectAll()
      }
      if (e.key === 'Escape') {
        setSelectedOrders(new Set())
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [orders])

  useEffect(() => {
    if (session?.user?.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchDeliveredOrders()
  }, [session, router])

  const fetchDeliveredOrders = async () => {
    try {
      setLoading(true)
      let url = '/api/orders?status=DELIVERED&limit=100'
      
      if (sortBy !== 'deliveredAt') {
        url += `&sortBy=${sortBy}`
      }
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders)
        calculateStats(data.orders)
        toast.success(`Fetched ${data.orders.length} delivered orders`)
      } else {
        throw new Error('Failed to fetch orders')
      }
    } catch (error) {
      console.error('Error fetching delivered orders:', error)
      toast.error('Failed to fetch delivered orders')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (orderList: Order[]) => {
    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)

    const todayOrders = orderList.filter(order => {
      const deliveredDate = new Date(order.deliveredAt || order.updatedAt)
      return deliveredDate >= today
    })

    const weekOrders = orderList.filter(order => {
      const deliveredDate = new Date(order.deliveredAt || order.updatedAt)
      return deliveredDate >= weekAgo
    })

    const monthOrders = orderList.filter(order => {
      const deliveredDate = new Date(order.deliveredAt || order.updatedAt)
      return deliveredDate >= monthAgo
    })

    const totalRevenue = orderList.reduce((sum, order) => sum + order.total, 0)
    const averageOrderValue = orderList.length > 0 ? totalRevenue / orderList.length : 0

    const reviewedOrders = orderList.filter(order => order.customerRating)
    const totalRating = reviewedOrders.reduce((sum, order) => sum + (order.customerRating || 0), 0)
    const averageRating = reviewedOrders.length > 0 ? totalRating / reviewedOrders.length : 0

    setStats({
      today: todayOrders.length,
      thisWeek: weekOrders.length,
      thisMonth: monthOrders.length,
      totalRevenue,
      averageOrderValue,
      totalOrders: orderList.length,
      averageRating,
      reviewedOrders: reviewedOrders.length
    })
  }

  const issueRefund = async (orderId: string) => {
    setUpdating(prev => new Set([...prev, orderId]))
    
    try {
      const response = await fetch(`/api/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REFUNDED',
          paymentStatus: 'REFUNDED',
          reason: 'Admin initiated refund'
        })
      })
      
      if (response.ok) {
        setOrders(prev => prev.filter(order => order.id !== orderId))
        setSelectedOrders(prev => {
          const newSet = new Set(prev)
          newSet.delete(orderId)
          return newSet
        })
        toast.success('Refund has been initiated successfully')
      } else {
        throw new Error('Failed to process refund')
      }
    } catch (error) {
      console.error('Error processing refund:', error)
      toast.error('Failed to process refund. Please try again.')
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    }
  }

  const handleBulkRefund = async () => {
    const eligibleOrders = Array.from(selectedOrders).filter(orderId => {
      const order = orders.find(o => o.id === orderId)
      return order && isRefundEligible(order)
    })

    if (eligibleOrders.length === 0) {
      toast.error('No eligible orders selected for refund')
      return
    }

    setUpdating(new Set(eligibleOrders))
    
    try {
      const results = await Promise.allSettled(
        eligibleOrders.map(id => 
          fetch(`/api/orders/${id}/refund`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'REFUNDED',
              paymentStatus: 'REFUNDED',
              reason: 'Bulk admin refund'
            })
          })
        )
      )
      
      const successful = results.filter(result => result.status === 'fulfilled').length
      const failed = results.length - successful
      
      if (successful > 0) {
        setOrders(prev => prev.filter(order => !eligibleOrders.includes(order.id)))
        setSelectedOrders(new Set())
        toast.success(`${successful} refunds processed${failed > 0 ? `, ${failed} failed` : ''}`)
      }
    } catch (error) {
      console.error('Error in bulk refund:', error)
      toast.error('Failed to process bulk refunds')
    } finally {
      setUpdating(new Set())
    }
  }

  const exportOrders = () => {
    const csvContent = [
      ['Order Number', 'Customer', 'Email', 'Total', 'Items', 'Delivered Date', 'Days Since Delivery', 'Rating', 'Feedback', 'Refund Eligible', 'Tracking Number'].join(','),
      ...filteredOrders.map(order => [
        order.orderNumber,
        order.user.name || 'N/A',
        order.user.email || 'N/A',
        order.total,
        order.items.length,
        formatDate(order.deliveredAt || order.updatedAt, ''),
        getDaysSinceDelivery(order.deliveredAt || order.updatedAt),
        order.customerRating || 'No rating',
        order.customerFeedback ? `"${order.customerFeedback.replace(/"/g, '""')}"` : 'No feedback',
        isRefundEligible(order) ? 'Yes' : 'No',
        order.trackingNumber || 'N/A'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `delivered-orders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Orders exported successfully')
  }

  const getDaysSinceDelivery = (deliveredAt: string) => {
    const delivered = new Date(deliveredAt)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - delivered.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const isRefundEligible = (order: Order): boolean => {
    const daysSinceDelivery = getDaysSinceDelivery(order.deliveredAt || order.updatedAt)
    return daysSinceDelivery <= 30 && order.paymentStatus === 'PAID' && order.status === 'DELIVERED'
  }

  const getCustomerRating = (rating?: number) => {
    if (!rating) return null
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm font-medium ml-1">({rating}/5)</span>
      </div>
    )
  }

  const toggleSelectAll = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)))
    }
  }

  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.user.email?.toLowerCase().includes(searchTerm.toLowerCase())

      const deliveredDate = new Date(order.deliveredAt || order.updatedAt)
      const now = new Date()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

      const matchesTime = 
        timeFilter === 'all' ||
        (timeFilter === 'today' && deliveredDate >= today) ||
        (timeFilter === 'week' && deliveredDate >= weekAgo) ||
        (timeFilter === 'month' && deliveredDate >= monthAgo) ||
        (timeFilter === '3months' && deliveredDate >= threeMonthsAgo)

      const matchesRating =
        ratingFilter === 'all' ||
        (ratingFilter === 'rated' && order.customerRating) ||
        (ratingFilter === 'unrated' && !order.customerRating) ||
        (ratingFilter === 'high' && order.customerRating && order.customerRating >= 4) ||
        (ratingFilter === 'low' && order.customerRating && order.customerRating < 4)

      const matchesRefund =
        refundFilter === 'all' ||
        (refundFilter === 'eligible' && isRefundEligible(order)) ||
        (refundFilter === 'expired' && !isRefundEligible(order))

      return matchesSearch && matchesTime && matchesRating && matchesRefund
    })
  }, [orders, searchTerm, timeFilter, ratingFilter, refundFilter])

  // Smart insights
  const insights = useMemo(() => {
    const alerts: Array<{ type: 'success' | 'warning' | 'info'; message: string }> = []
    
    if (stats && stats.averageRating >= 4.5 && stats.reviewedOrders > 5) {
      alerts.push({
        type: 'success',
        message: `Excellent! Your average customer rating is ${stats.averageRating.toFixed(1)}/5 ⭐`
      })
    }

    const awaitingReview = filteredOrders.filter(o => !o.customerRating).length
    if (awaitingReview > 10) {
      alerts.push({
        type: 'info',
        message: `${awaitingReview} orders are awaiting customer reviews`
      })
    }

    const eligibleRefunds = filteredOrders.filter(o => isRefundEligible(o)).length
    if (eligibleRefunds > 0) {
      alerts.push({
        type: 'info',
        message: `${eligibleRefunds} orders are still eligible for refunds (within 30 days)`
      })
    }

    if (stats && stats.averageRating < 3 && stats.reviewedOrders > 5) {
      alerts.push({
        type: 'warning',
        message: `Average rating is low (${stats.averageRating.toFixed(1)}/5). Consider reviewing recent deliveries.`
      })
    }

    return alerts
  }, [stats, filteredOrders])

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-full" />
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="flex items-center flex-1">
            <Button variant="ghost" size="icon" asChild className="mr-4">
              <Link href="/dashboard/orders">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div className="flex items-center">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg mr-4">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Delivered Orders
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {filteredOrders.length} successfully completed orders
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <kbd className="px-2 py-1 bg-gray-100 border rounded">Ctrl+R</kbd>
                  <span>Refresh</span>
                  <kbd className="px-2 py-1 bg-gray-100 border rounded">Ctrl+A</kbd>
                  <span>Select all</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Insights */}
        {insights.length > 0 && (
          <div className="space-y-2 mb-6">
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
                {insight.type === 'success' && <Award className="h-4 w-4 text-green-600" />}
                {insight.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                {insight.type === 'info' && <PackageCheck className="h-4 w-4 text-blue-600" />}
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

        {/* Stats Cards */}
        {stats && (
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Total Revenue
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatPrice(stats.totalRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatPrice(stats.averageOrderValue)} avg
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    This Month
                  </p>
                  <p className="text-xl font-bold text-gray-900">{stats.thisMonth}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.today} today
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Avg Rating
                  </p>
                  <p className="text-xl font-bold text-yellow-600">
                    {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.reviewedOrders} reviews
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Completion Rate
                  </p>
                  <p className="text-xl font-bold text-green-600">
                    {stats.totalOrders > 0 ? '100%' : '0%'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.totalOrders} orders
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                </SelectContent>
              </Select>

              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Rating filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="rated">Has Rating</SelectItem>
                  <SelectItem value="unrated">No Rating</SelectItem>
                  <SelectItem value="high">4+ Stars</SelectItem>
                  <SelectItem value="low">Below 4 Stars</SelectItem>
                </SelectContent>
              </Select>

              <Select value={refundFilter} onValueChange={setRefundFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Refund status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="eligible">Refund Eligible</SelectItem>
                  <SelectItem value="expired">Refund Expired</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={() => {
                  setSearchTerm('')
                  setTimeFilter('all')
                  setRatingFilter('all')
                  setRefundFilter('all')
                }}
                variant="outline"
                className="w-full"
              >
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          {selectedOrders.size > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
              <Checkbox
                checked={selectedOrders.size === filteredOrders.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm font-medium text-green-900">
                {selectedOrders.size} selected
              </span>
            </div>
          )}
          
          <Button
            onClick={fetchDeliveredOrders}
            variant="outline"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            onClick={exportOrders}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>

          {selectedOrders.size > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline"
                  className="flex items-center gap-2 text-orange-600 hover:text-orange-700"
                  disabled={!Array.from(selectedOrders).some(id => {
                    const order = orders.find(o => o.id === id)
                    return order && isRefundEligible(order)
                  })}
                >
                  <AlertCircle className="w-4 h-4" />
                  Bulk Refund ({Array.from(selectedOrders).filter(id => {
                    const order = orders.find(o => o.id === id)
                    return order && isRefundEligible(order)
                  }).length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Issue Bulk Refunds</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to issue refunds for the selected eligible orders? 
                    This action cannot be undone and customers will be notified.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleBulkRefund}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Issue Refunds
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <CardTitle className="text-xl mb-2">
                {searchTerm || timeFilter !== 'all' || ratingFilter !== 'all' || refundFilter !== 'all'
                  ? 'No matching orders' 
                  : 'No Delivered Orders'
                }
              </CardTitle>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm || timeFilter !== 'all' || ratingFilter !== 'all' || refundFilter !== 'all'
                  ? 'Try adjusting your filters to see more results'
                  : 'No orders have been delivered yet.'
                }
              </p>
              {(searchTerm || timeFilter !== 'all' || ratingFilter !== 'all' || refundFilter !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('')
                    setTimeFilter('all')
                    setRatingFilter('all')
                    setRefundFilter('all')
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const daysSinceDelivery = getDaysSinceDelivery(order.deliveredAt || order.updatedAt)
              const canRefund = isRefundEligible(order)
              
              return (
                <Card key={order.id} className={`border-green-200 dark:border-green-800 ${
                  selectedOrders.has(order.id) ? 'ring-2 ring-green-500' : ''
                }`}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="space-y-4">
                      {/* Order Header */}
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1">
                          <Checkbox
                            checked={selectedOrders.has(order.id)}
                            onCheckedChange={() => toggleSelectOrder(order.id)}
                          />
                          <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg flex-shrink-0">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                                Order #{order.orderNumber}
                              </h3>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  daysSinceDelivery <= 7 ? 'border-green-500 text-green-700' : 
                                  daysSinceDelivery <= 30 ? 'border-blue-500 text-blue-700' :
                                  'border-gray-500 text-gray-700'
                                }`}
                              >
                                <Clock className="w-3 h-3 mr-1" />
                                {daysSinceDelivery} days ago
                              </Badge>
                              {canRefund && (
                                <Badge variant="secondary" className="text-xs">
                                  Refund eligible
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">
                                  {order.user.name || order.user.email}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 flex-shrink-0" />
                                <span className="whitespace-nowrap">
                                  {formatDate(order.deliveredAt || order.updatedAt, '')}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Package className="w-3 h-3 flex-shrink-0" />
                                <span>{order.items.length} items</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:flex-shrink-0">
                          <div className="text-left sm:text-right">
                            <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                              {formatPrice(order.total)}
                            </div>
                            <div className="flex items-center gap-2 text-sm flex-wrap">
                              <span className="text-gray-500 dark:text-gray-400">Payment:</span>
                              <Badge variant={order.paymentStatus === 'PAID' ? 'default' : 'secondary'}>
                                {order.paymentStatus}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Customer Rating */}
                      {order.customerRating ? (
                        <>
                          <Separator />
                          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                                  <Star className="w-5 h-5 text-yellow-500" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Customer Rating
                                  </p>
                                  {getCustomerRating(order.customerRating)}
                                </div>
                              </div>
                              {order.customerFeedback && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <MessageSquare className="w-4 h-4 mr-2" />
                                      View Feedback
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-sm">{order.customerFeedback}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <Separator />
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-300">
                              <Star className="w-4 h-4" />
                              <span>Awaiting customer review</span>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Tracking Info */}
                      {order.trackingNumber && (
                        <>
                          <Separator />
                          <div className="flex items-center gap-3 text-sm flex-wrap">
                            <span className="text-gray-500 dark:text-gray-400">Tracking:</span>
                            <code className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {order.trackingNumber}
                            </code>
                            {order.carrier && (
                              <Badge variant="secondary" className="text-xs">
                                {order.carrier}
                              </Badge>
                            )}
                          </div>
                        </>
                      )}

                      <Separator />

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="icon" asChild>
                                <Link href={`/dashboard/orders/${order.id}`}>
                                  <Eye className="w-4 h-4" />
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View order details</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => window.open(`/dashboard/orders/${order.id}/invoice`, '_blank')}
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Print invoice</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          {!canRefund && (
                            <Badge variant="outline" className="text-xs text-gray-500">
                              Refund period expired
                            </Badge>
                          )}
                        </div>
                        
                        {/* Mobile dropdown */}
                        <div className="sm:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon">
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <a href={`mailto:${order.user.email}?subject=Your Order ${order.orderNumber}`}>
                                  <Mail className="w-4 h-4 mr-2" />
                                  Email Customer
                                </a>
                              </DropdownMenuItem>
                              {order.user.phone && (
                                <DropdownMenuItem asChild>
                                  <a href={`tel:${order.user.phone}`}>
                                    <Phone className="w-4 h-4 mr-2" />
                                    Call Customer
                                  </a>
                                </DropdownMenuItem>
                              )}
                              {canRefund && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => issueRefund(order.id)}
                                    disabled={updating.has(order.id)}
                                    className="text-orange-600"
                                  >
                                    <AlertCircle className="w-4 h-4 mr-2" />
                                    {updating.has(order.id) ? 'Processing...' : 'Issue Refund'}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {/* Desktop actions */}
                        <div className="hidden sm:flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm" asChild>
                                <a href={`mailto:${order.user.email}?subject=Your Order ${order.orderNumber}`}>
                                  <Mail className="w-4 h-4 mr-2" />
                                  Email
                                </a>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Email customer</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          {canRefund && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={updating.has(order.id)}
                                  className="text-orange-600 hover:text-orange-700 border-orange-200 hover:bg-orange-50"
                                >
                                  {updating.has(order.id) ? (
                                    <>
                                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <AlertCircle className="w-4 h-4 mr-2" />
                                      Issue Refund
                                    </>
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Issue Refund</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to issue a refund for order #{order.orderNumber}? 
                                    This will refund {formatPrice(order.total)} to the customer and cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => issueRefund(order.id)}
                                    className="bg-orange-600 hover:bg-orange-700"
                                  >
                                    Issue Refund
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                      
                      {/* Success indicators */}
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                          <CheckCircle className="w-3 h-3" />
                          <span>Delivered</span>
                        </div>
                        {order.paymentStatus === 'PAID' && (
                          <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                            <CheckCircle className="w-3 h-3" />
                            <span>Paid</span>
                          </div>
                        )}
                        {order.customerRating ? (
                          <div className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
                            <Star className="w-3 h-3" />
                            <span>Reviewed</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded">
                            <Star className="w-3 h-3" />
                            <span>Awaiting review</span>
                          </div>
                        )}
                        {canRefund && (
                          <div className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
                            <Clock className="w-3 h-3" />
                            <span>{30 - daysSinceDelivery} days left for refund</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Success Message */}
        {filteredOrders.length > 0 && (
          <Alert className="mt-8 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-800 dark:text-green-300">
              All orders successfully delivered
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-400">
              {filteredOrders.length} orders have been completed and delivered to customers. 
              {stats && stats.averageRating > 0 && (
                <> Average customer rating: <strong>{stats.averageRating.toFixed(1)}/5</strong> ⭐</>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </TooltipProvider>
  )
}