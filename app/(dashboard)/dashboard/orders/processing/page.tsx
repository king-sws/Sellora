/* eslint-disable react/no-unescaped-entities */
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  Package, ArrowLeft, Truck, RefreshCw, 
  Eye, User, Calendar, AlertCircle, ChevronDown, 
  CheckCircle, Clock, DollarSign, TrendingUp, Search,
  X, Filter, Download, Printer
} from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
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
  priority: string
  createdAt: string
  items: Array<{
    id: string
    quantity: number
    product: {
      name: string
    }
  }>
  trackingNumber?: string
}

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800',
  NORMAL: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800'
}

export default function ProcessingOrdersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<Set<string>>(new Set())
  const [trackingNumbers, setTrackingNumbers] = useState<{[key: string]: string}>({})
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + R to refresh
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault()
        fetchProcessingOrders()
      }
      // Ctrl/Cmd + A to select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        toggleSelectAll()
      }
      // Escape to clear selection
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
    fetchProcessingOrders()
  }, [session, router])

  const fetchProcessingOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/orders?status=PROCESSING&limit=50')
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders)
        
        // Initialize tracking numbers for existing orders
        const initialTracking: {[key: string]: string} = {}
        data.orders.forEach((order: Order) => {
          if (order.trackingNumber) {
            initialTracking[order.id] = order.trackingNumber
          }
        })
        setTrackingNumbers(prev => ({ ...prev, ...initialTracking }))
        
        toast.success(`Fetched ${data.orders.length} processing orders`)
      } else {
        throw new Error('Failed to fetch orders')
      }
    } catch (error) {
      console.error('Error fetching processing orders:', error)
      toast.error('Failed to fetch processing orders')
    } finally {
      setLoading(false)
    }
  }

  const validateTrackingNumber = (trackingNumber: string): boolean => {
    if (!trackingNumber.trim()) return false
    // Basic validation - adjust regex based on your shipping providers
    const trackingRegex = /^[A-Z0-9]{8,30}$/i
    return trackingRegex.test(trackingNumber.trim())
  }

  const markAsShipped = async (orderId: string) => {
    const trackingNumber = trackingNumbers[orderId]?.trim()
    
    if (!trackingNumber) {
      setValidationErrors(prev => ({ ...prev, [orderId]: 'Tracking number is required' }))
      toast.error('Tracking number is required')
      return
    }

    if (!validateTrackingNumber(trackingNumber)) {
      setValidationErrors(prev => ({ 
        ...prev, 
        [orderId]: 'Please enter a valid tracking number (8-30 alphanumeric characters)' 
      }))
      toast.error('Please enter a valid tracking number')
      return
    }

    setUpdating(prev => new Set([...prev, orderId]))
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[orderId]
      return newErrors
    })
    
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'SHIPPED',
          trackingNumber: trackingNumber
        })
      })
      
      if (response.ok) {
        setOrders(prev => prev.filter(order => order.id !== orderId))
        setTrackingNumbers(prev => {
          const newTracking = { ...prev }
          delete newTracking[orderId]
          return newTracking
        })
        setSelectedOrders(prev => {
          const newSet = new Set(prev)
          newSet.delete(orderId)
          return newSet
        })
        toast.success(`Order #${orders.find(o => o.id === orderId)?.orderNumber} marked as shipped`)
      } else {
        throw new Error('Failed to update order status')
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Failed to mark order as shipped')
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    }
  }

  const updateTrackingNumber = (orderId: string, value: string) => {
    setTrackingNumbers(prev => ({ ...prev, [orderId]: value }))
    // Clear validation error when user starts typing
    if (validationErrors[orderId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[orderId]
        return newErrors
      })
    }
  }

  const handleBulkShip = async () => {
    const ordersWithTracking = orders.filter(order => 
      selectedOrders.has(order.id) && 
      trackingNumbers[order.id] && 
      validateTrackingNumber(trackingNumbers[order.id])
    )
    
    if (ordersWithTracking.length === 0) {
      toast.error('Please select orders and add valid tracking numbers')
      return
    }

    const orderIds = ordersWithTracking.map(order => order.id)
    setUpdating(new Set(orderIds))
    
    try {
      const results = await Promise.allSettled(
        ordersWithTracking.map(order => 
          fetch(`/api/orders/${order.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              status: 'SHIPPED',
              trackingNumber: trackingNumbers[order.id].trim()
            })
          })
        )
      )
      
      const successful = results.filter(result => result.status === 'fulfilled').length
      const failed = results.length - successful
      
      if (successful > 0) {
        setOrders(prev => prev.filter(order => !orderIds.includes(order.id)))
        orderIds.forEach(id => {
          setTrackingNumbers(prev => {
            const newTracking = { ...prev }
            delete newTracking[id]
            return newTracking
          })
        })
        setSelectedOrders(new Set())
        toast.success(`${successful} orders shipped successfully${failed > 0 ? `, ${failed} failed` : ''}`)
      }
    } catch (error) {
      console.error('Error in bulk shipping:', error)
      toast.error('Failed to ship orders')
    } finally {
      setUpdating(new Set())
    }
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
      ['Order Number', 'Customer', 'Email', 'Total', 'Items', 'Priority', 'Payment Status', 'Date', 'Tracking Number'].join(','),
      ...filteredOrders.map(order => [
        order.orderNumber,
        order.user.name || 'N/A',
        order.user.email || 'N/A',
        order.total,
        order.items.length,
        order.priority,
        order.paymentStatus,
        formatDate(order.createdAt, ''),
        trackingNumbers[order.id] || 'Not set'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `processing-orders-${new Date().toISOString().split('T')[0]}.csv`
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
        order.user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesPriority = priorityFilter === 'all' || order.priority === priorityFilter
      const matchesPayment = paymentFilter === 'all' || order.paymentStatus === paymentFilter
      
      return matchesSearch && matchesPriority && matchesPayment
    })
  }, [orders, searchTerm, priorityFilter, paymentFilter])

  // Order statistics
  const orderStats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0)
    const urgentOrders = filteredOrders.filter(o => o.priority === 'URGENT').length
    const readyToShip = filteredOrders.filter(o => 
      trackingNumbers[o.id] && validateTrackingNumber(trackingNumbers[o.id])
    ).length
    
    return {
      totalRevenue,
      urgentOrders,
      readyToShip,
      totalOrders: filteredOrders.length
    }
  }, [filteredOrders, trackingNumbers])

  // Smart insights
  const insights = useMemo(() => {
    const alerts: Array<{ type: 'success' | 'warning' | 'info'; message: string }> = []
    
    if (orderStats.urgentOrders > 0) {
      alerts.push({
        type: 'warning',
        message: `${orderStats.urgentOrders} urgent orders need immediate processing!`
      })
    }
    
    if (orderStats.readyToShip > 5) {
      alerts.push({
        type: 'success',
        message: `${orderStats.readyToShip} orders are ready to ship! 🚀`
      })
    }
    
    const oldOrders = filteredOrders.filter(o => {
      const daysSince = (Date.now() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      return daysSince > 2
    }).length
    
    if (oldOrders > 0) {
      alerts.push({
        type: 'info',
        message: `${oldOrders} orders have been processing for more than 2 days`
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
        
        {/* Stats skeleton */}
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
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
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
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg mr-4">
              <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                Processing Orders
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {filteredOrders.length} orders being prepared for shipment
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
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 mb-6">
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
                <Package className="w-3 h-3" />
                Total Orders
              </p>
              <p className="text-xl font-bold text-gray-900">{orderStats.totalOrders}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                <Truck className="w-3 h-3" />
                Ready to Ship
              </p>
              <p className="text-xl font-bold text-green-600">{orderStats.readyToShip}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Urgent
              </p>
              <p className="text-xl font-bold text-red-600">{orderStats.urgentOrders}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
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
                setPriorityFilter('all')
                setPaymentFilter('all')
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
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
            <Checkbox
              checked={selectedOrders.size === filteredOrders.length}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm font-medium text-blue-900">
              {selectedOrders.size} selected
            </span>
          </div>
        )}
        
        <Button
          onClick={fetchProcessingOrders}
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
                className="flex items-center gap-2"
                disabled={Array.from(selectedOrders).filter(id => 
                  trackingNumbers[id] && validateTrackingNumber(trackingNumbers[id])
                ).length === 0}
              >
                <Truck className="w-4 h-4" />
                Ship Selected ({Array.from(selectedOrders).filter(id => 
                  trackingNumbers[id] && validateTrackingNumber(trackingNumbers[id])
                ).length})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ship Selected Orders</AlertDialogTitle>
                <AlertDialogDescription>
                  This will mark all selected orders with valid tracking numbers as shipped. 
                  Make sure all tracking numbers are correct as this action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkShip}>
                  Ship Orders
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <CardTitle className="text-xl mb-2">
              {searchTerm || priorityFilter !== 'all' || paymentFilter !== 'all' 
                ? 'No matching orders' 
                : 'No Processing Orders'
              }
            </CardTitle>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm || priorityFilter !== 'all' || paymentFilter !== 'all'
                ? 'Try adjusting your filters to see more results'
                : 'No orders are currently being processed.'
              }
            </p>
            {(searchTerm || priorityFilter !== 'all' || paymentFilter !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setPriorityFilter('all')
                  setPaymentFilter('all')
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
            <Card key={order.id} className={`border-purple-200 dark:border-purple-800 ${
              selectedOrders.has(order.id) ? 'ring-2 ring-purple-500' : ''
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
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex-shrink-0">
                        <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                          Order #{order.orderNumber}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">
                              {order.user.name || order.user.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            <span className="whitespace-nowrap">
                              {formatDate(order.createdAt, '')}
                            </span>
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
                          <span className="text-gray-500 dark:text-gray-400">
                            {order.items.length} items
                          </span>
                          <Badge className={priorityColors[order.priority as keyof typeof priorityColors]}>
                            {order.priority}
                          </Badge>
                          {getPaymentStatusBadge(order.paymentStatus)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Tracking Section */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor={`tracking-${order.id}`} className="text-sm font-medium">
                          Tracking Number *
                        </Label>
                        <Input
                          id={`tracking-${order.id}`}
                          type="text"
                          value={trackingNumbers[order.id] || ''}
                          onChange={(e) => updateTrackingNumber(order.id, e.target.value)}
                          placeholder="Enter tracking number (e.g., 1Z123456789)"
                          className={validationErrors[order.id] ? 'border-red-500' : ''}
                        />
                        {validationErrors[order.id] && (
                          <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors[order.id]}
                          </p>
                        )}
                        {trackingNumbers[order.id] && validateTrackingNumber(trackingNumbers[order.id]) && (
                          <p className="text-sm text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Valid tracking number
                          </p>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-end gap-2">
                        <Button variant="outline" size="icon" asChild>
                          <Link href={`/dashboard/orders/${order.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => window.open(`/dashboard/orders/${order.id}/invoice`, '_blank')}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        
                        {/* Mobile dropdown */}
                        <div className="sm:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon">
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => markAsShipped(order.id)}
                                disabled={updating.has(order.id) || !trackingNumbers[order.id]}
                              >
                                <Truck className="w-4 h-4 mr-2" />
                                {updating.has(order.id) ? 'Shipping...' : 'Mark Shipped'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {/* Desktop button */}
                        <div className="hidden sm:block">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                disabled={updating.has(order.id) || !trackingNumbers[order.id]?.trim()}
                                className="flex items-center gap-2"
                              >
                                {updating.has(order.id) ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Shipping...
                                  </>
                                ) : (
                                  <>
                                    <Truck className="w-4 h-4" />
                                    Mark Shipped
                                  </>
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Mark Order as Shipped</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to mark order #{order.orderNumber} as shipped 
                                  with tracking number "{trackingNumbers[order.id]}"? 
                                  The customer will be notified automatically.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => markAsShipped(order.id)}>
                                  Mark as Shipped
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}