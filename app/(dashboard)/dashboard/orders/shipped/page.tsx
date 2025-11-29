/* eslint-disable react/no-unescaped-entities */
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  Truck, ArrowLeft, CheckCircle, RefreshCw, 
  Eye, User, Calendar, Package2, ChevronDown,
  Copy, MapPin, ExternalLink, AlertCircle,
  Search, X, Download, Printer, Clock, DollarSign,
  TrendingUp
} from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { toast } from 'sonner'

interface Order {
  id: string
  orderNumber: string
  user: {
    id: string
    name: string | null
    email: string | null
  }
  total: number
  status: string
  paymentStatus: string
  createdAt: string
  shippedAt?: string
  items: Array<{
    id: string
    quantity: number
    product: {
      name: string
    }
  }>
  trackingNumber?: string
  carrier?: string
  shippingAddress?: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
}

const CARRIER_TRACKING_URLS: Record<string, string> = {
  'UPS': 'https://www.ups.com/track?track=yes&trackNums=',
  'FEDEX': 'https://www.fedex.com/fedextrack/?trknbr=',
  'USPS': 'https://tools.usps.com/go/TrackConfirmAction?tLabels=',
  'DHL': 'https://www.dhl.com/en/express/tracking.html?AWB=',
  'AMAZON': 'https://track.amazon.com/tracking/',
  'DEFAULT': 'https://www.google.com/search?q=track+package+'
}

export default function ShippedOrdersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<Set<string>>(new Set())
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [carrierFilter, setCarrierFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [transitDaysFilter, setTransitDaysFilter] = useState('all')

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault()
        fetchShippedOrders()
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
    fetchShippedOrders()
  }, [session, router])

  const fetchShippedOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/orders?status=SHIPPED&limit=50')
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders)
        toast.success(`Fetched ${data.orders.length} shipped orders`)
      } else {
        throw new Error('Failed to fetch orders')
      }
    } catch (error) {
      console.error('Error fetching shipped orders:', error)
      toast.error('Failed to fetch shipped orders')
    } finally {
      setLoading(false)
    }
  }

  const markAsDelivered = async (orderId: string) => {
    setUpdating(prev => new Set([...prev, orderId]))
    
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DELIVERED' })
      })
      
      if (response.ok) {
        setOrders(prev => prev.filter(order => order.id !== orderId))
        setSelectedOrders(prev => {
          const newSet = new Set(prev)
          newSet.delete(orderId)
          return newSet
        })
        toast.success(`Order #${orders.find(o => o.id === orderId)?.orderNumber} marked as delivered`)
      } else {
        throw new Error('Failed to update order status')
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Failed to mark order as delivered')
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    }
  }

  const handleBulkDelivered = async () => {
    const orderIds = Array.from(selectedOrders)
    setUpdating(new Set(orderIds))
    
    try {
      const results = await Promise.allSettled(
        orderIds.map(id => 
          fetch(`/api/orders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'DELIVERED' })
          })
        )
      )
      
      const successful = results.filter(result => result.status === 'fulfilled').length
      const failed = results.length - successful
      
      if (successful > 0) {
        setOrders(prev => prev.filter(order => !orderIds.includes(order.id)))
        setSelectedOrders(new Set())
        toast.success(`${successful} orders marked as delivered${failed > 0 ? `, ${failed} failed` : ''}`)
      }
    } catch (error) {
      console.error('Error in bulk delivery:', error)
      toast.error('Failed to mark orders as delivered')
    } finally {
      setUpdating(new Set())
    }
  }

  const getTrackingUrl = (trackingNumber: string, carrier?: string): string => {
    const carrierKey = carrier?.toUpperCase() || 'DEFAULT'
    const baseUrl = CARRIER_TRACKING_URLS[carrierKey] || CARRIER_TRACKING_URLS['DEFAULT']
    return baseUrl + encodeURIComponent(trackingNumber)
  }

  const copyTrackingNumber = async (trackingNumber: string) => {
    try {
      await navigator.clipboard.writeText(trackingNumber)
      toast.success('Tracking number copied to clipboard')
    } catch (error) {
      toast.error('Could not copy tracking number')
    }
  }

  const getDaysInTransit = (shippedAt: string): number => {
    return Math.floor((new Date().getTime() - new Date(shippedAt).getTime()) / (1000 * 60 * 60 * 24))
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

  const exportOrders = () => {
    const csvContent = [
      ['Order Number', 'Customer', 'Email', 'Total', 'Items', 'Payment Status', 'Shipped Date', 'Days in Transit', 'Tracking Number', 'Carrier', 'Destination'].join(','),
      ...filteredOrders.map(order => [
        order.orderNumber,
        order.user.name || 'N/A',
        order.user.email || 'N/A',
        order.total,
        order.items.length,
        order.paymentStatus,
        formatDate(order.shippedAt || order.createdAt, ''),
        getDaysInTransit(order.shippedAt || order.createdAt),
        order.trackingNumber || 'Not set',
        order.carrier || 'N/A',
        order.shippingAddress ? `${order.shippingAddress.city}, ${order.shippingAddress.state}` : 'N/A'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shipped-orders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Orders exported successfully')
  }

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCarrier = carrierFilter === 'all' || order.carrier === carrierFilter
      const matchesPayment = paymentFilter === 'all' || order.paymentStatus === paymentFilter
      
      const daysInTransit = getDaysInTransit(order.shippedAt || order.createdAt)
      const matchesTransitDays = 
        transitDaysFilter === 'all' ||
        (transitDaysFilter === '0-3' && daysInTransit <= 3) ||
        (transitDaysFilter === '4-7' && daysInTransit >= 4 && daysInTransit <= 7) ||
        (transitDaysFilter === '8+' && daysInTransit >= 8)
      
      return matchesSearch && matchesCarrier && matchesPayment && matchesTransitDays
    })
  }, [orders, searchTerm, carrierFilter, paymentFilter, transitDaysFilter])

  // Order statistics
  const orderStats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0)
    const avgDaysInTransit = filteredOrders.length > 0
      ? Math.round(filteredOrders.reduce((sum, o) => sum + getDaysInTransit(o.shippedAt || o.createdAt), 0) / filteredOrders.length)
      : 0
    const missingTracking = filteredOrders.filter(o => !o.trackingNumber).length
    const delayedOrders = filteredOrders.filter(o => getDaysInTransit(o.shippedAt || o.createdAt) > 7).length
    
    return {
      totalRevenue,
      avgDaysInTransit,
      missingTracking,
      delayedOrders,
      totalOrders: filteredOrders.length
    }
  }, [filteredOrders])

  // Smart insights
  const insights = useMemo(() => {
    const alerts: Array<{ type: 'success' | 'warning' | 'info'; message: string }> = []
    
    if (orderStats.delayedOrders > 0) {
      alerts.push({
        type: 'warning',
        message: `${orderStats.delayedOrders} orders have been in transit for more than 7 days`
      })
    }
    
    if (orderStats.missingTracking > 0) {
      alerts.push({
        type: 'warning',
        message: `${orderStats.missingTracking} orders don't have tracking numbers`
      })
    }
    
    if (orderStats.avgDaysInTransit <= 3 && filteredOrders.length > 5) {
      alerts.push({
        type: 'success',
        message: `Great job! Average delivery time is ${orderStats.avgDaysInTransit} days 🚀`
      })
    }
    
    const recentShipments = filteredOrders.filter(o => 
      getDaysInTransit(o.shippedAt || o.createdAt) <= 1
    ).length
    
    if (recentShipments > 5) {
      alerts.push({
        type: 'info',
        message: `${recentShipments} orders shipped in the last 24 hours`
      })
    }
    
    return alerts
  }, [orderStats, filteredOrders])

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      PAID: "default",
      PENDING: "secondary",
      FAILED: "destructive"
    }
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status}
      </Badge>
    )
  }

  // Get unique carriers for filter
  const uniqueCarriers = useMemo(() => {
    const carriers = new Set(orders.map(o => o.carrier).filter(Boolean))
    return Array.from(carriers)
  }, [orders])

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
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg mr-4">
                <Truck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Shipped Orders
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {filteredOrders.length} orders currently in transit
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
                {insight.type === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                {insight.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                {insight.type === 'info' && <Clock className="h-4 w-4 text-blue-600" />}
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

        {/* Quick Stats */}
        <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200 mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Total Value
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {formatPrice(orderStats.totalRevenue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  In Transit
                </p>
                <p className="text-xl font-bold text-gray-900">{orderStats.totalOrders}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Avg Transit Time
                </p>
                <p className="text-xl font-bold text-indigo-600">{orderStats.avgDaysInTransit} days</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Delayed (7+ days)
                </p>
                <p className="text-xl font-bold text-red-600">{orderStats.delayedOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
              
              <select
                value={carrierFilter}
                onChange={(e) => setCarrierFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Carriers</option>
                {uniqueCarriers.map(carrier => (
                  <option key={carrier} value={carrier}>{carrier}</option>
                ))}
              </select>

              <select
                value={transitDaysFilter}
                onChange={(e) => setTransitDaysFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Transit Times</option>
                <option value="0-3">0-3 days</option>
                <option value="4-7">4-7 days</option>
                <option value="8+">8+ days</option>
              </select>

              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Payments</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </select>

              <Button
                onClick={() => {
                  setSearchTerm('')
                  setCarrierFilter('all')
                  setPaymentFilter('all')
                  setTransitDaysFilter('all')
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
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-lg border border-indigo-200">
              <Checkbox
                checked={selectedOrders.size === filteredOrders.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm font-medium text-indigo-900">
                {selectedOrders.size} selected
              </span>
            </div>
          )}
          
          <Button
            onClick={fetchShippedOrders}
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
                <Button className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Mark Selected Delivered ({selectedOrders.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Mark Selected Orders as Delivered</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to mark {selectedOrders.size} selected orders as delivered? 
                    Customers will be notified and this action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDelivered}>
                    Mark as Delivered
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Truck className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <CardTitle className="text-xl mb-2">
                {searchTerm || carrierFilter !== 'all' || paymentFilter !== 'all' || transitDaysFilter !== 'all'
                  ? 'No matching orders' 
                  : 'No Shipped Orders'
                }
              </CardTitle>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchTerm || carrierFilter !== 'all' || paymentFilter !== 'all' || transitDaysFilter !== 'all'
                  ? 'Try adjusting your filters to see more results'
                  : 'No orders are currently in transit.'
                }
              </p>
              {(searchTerm || carrierFilter !== 'all' || paymentFilter !== 'all' || transitDaysFilter !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('')
                    setCarrierFilter('all')
                    setPaymentFilter('all')
                    setTransitDaysFilter('all')
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className={`border-indigo-200 dark:border-indigo-800 ${
                selectedOrders.has(order.id) ? 'ring-2 ring-indigo-500' : ''
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
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg flex-shrink-0">
                          <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                              Order #{order.orderNumber}
                            </h3>
                            {order.shippedAt && (
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  getDaysInTransit(order.shippedAt) > 7 
                                    ? 'border-red-500 text-red-700' 
                                    : 'border-blue-500 text-blue-700'
                                }`}
                              >
                                {getDaysInTransit(order.shippedAt)} days in transit
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
                                Shipped: {formatDate(order.shippedAt || order.createdAt, '')}
                              </span>
                            </div>
                            {order.shippingAddress && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">
                                  {order.shippingAddress.city}, {order.shippingAddress.state}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:flex-shrink-0">
                        <div className="text-left sm:text-right">
                          <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {formatPrice(order.total)}
                          </div>
                          <div className="flex items-center gap-2 text-sm flex-wrap">
                            <span className="text-gray-500 dark:text-gray-400">
                              {order.items.length} items • Payment:
                            </span>
                            {getPaymentStatusBadge(order.paymentStatus)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tracking Section */}
                    {order.trackingNumber && (
                      <>
                        <Separator />
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                <Package2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  Tracking Number
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <code className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                    {order.trackingNumber}
                                  </code>
                                  {order.carrier && (
                                    <Badge variant="secondary" className="text-xs">
                                      {order.carrier}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => copyTrackingNumber(order.trackingNumber!)}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Copy tracking number</p>
                                </TooltipContent>
                              </Tooltip>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="flex items-center gap-2"
                              >
                                <a 
                                  href={getTrackingUrl(order.trackingNumber, order.carrier)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Track Package
                                </a>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {!order.trackingNumber && (
                      <>
                        <Separator />
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-800">
                              No tracking number available for this order
                            </span>
                          </div>
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
                            {order.trackingNumber && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => copyTrackingNumber(order.trackingNumber!)}
                                >
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copy Tracking
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a 
                                    href={getTrackingUrl(order.trackingNumber, order.carrier)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Track Package
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem
                              onClick={() => markAsDelivered(order.id)}
                              disabled={updating.has(order.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              {updating.has(order.id) ? 'Updating...' : 'Mark Delivered'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {/* Desktop button */}
                      <div className="hidden sm:block">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              disabled={updating.has(order.id)}
                              className="flex items-center gap-2"
                            >
                              {updating.has(order.id) ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4" />
                                  Mark Delivered
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Mark Order as Delivered</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to mark order #{order.orderNumber} as delivered? 
                                The customer will be notified and this action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => markAsDelivered(order.id)}>
                                Mark as Delivered
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}