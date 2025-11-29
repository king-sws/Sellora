'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { toast } from 'sonner'

// shadcn/ui imports
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Switch } from '@/components/ui/switch'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'

// Lucide React icons
import {
  Eye, Search, Filter, MoreHorizontal, Edit, Package,
  Truck, CheckCircle, XCircle, Clock, AlertCircle,
  RefreshCw, Download, ChevronDown, Calendar,
  FileText, DollarSign, User, MapPin, Star,
  ArrowUpDown, ArrowUp, ArrowDown, Menu, X,
  ChevronRight, Smartphone, Tablet, Monitor, TrendingUp,
  Printer, CircleStar, Play, Pause
} from 'lucide-react'

import { formatPrice, formatDate, ORDER_STATUS_COLORS } from '@/lib/utils'

// Enhanced interfaces
interface Order {
  id: string
  orderNumber: string
  user: {
    id: string
    name: string | null
    email: string | null
  }
  total: number
  subtotal: number
  tax: number
  shipping: number
  status: string
  paymentStatus: string
  priority: string
  source: string
  createdAt: string
  updatedAt: string
  trackingNumber?: string
  trackingUrl?: string
  estimatedDelivery?: string
  deliveredAt?: string
  items: Array<{
    id: string
    quantity: number
    price: number
    product: {
      id: string
      name: string
      images: string[]
      slug: string
      sku?: string
    }
  }>
  shippingAddress?: {
    firstName: string
    lastName: string
    address1: string
    city: string
    state: string
    country: string
  }
  shippingMethod?: {
    name: string
    estimatedDays?: number
  }
  statusHistory?: Array<{
    fromStatus: string
    toStatus: string
    timestamp: string
    changedByUser: {
      name: string
      email: string
    }
    reason?: string
  }>
  refunds?: Array<{
    amount: number
    status: string
    reason?: string
    createdAt: string
  }>
  notes?: Array<{
    content: string
    isInternal: boolean
    createdAt: string
    author: {
      name: string
      email: string
    }
  }>
}

const statusIcons = {
  PENDING: Clock,
  CONFIRMED: CheckCircle,
  PROCESSING: Package,
  SHIPPED: Truck,
  DELIVERED: CheckCircle,
  CANCELLED: XCircle,
  REFUNDED: AlertCircle
}

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800 border-gray-200',
  NORMAL: 'bg-blue-100 text-blue-800 border-blue-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  URGENT: 'bg-red-100 text-red-800 border-red-200'
}

const statusActions = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: []
}

// Skeleton Components
const OrderTableSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-96" />
    </CardHeader>
    <CardContent className="p-0">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {[...Array(8)].map((_, i) => (
                <th key={i} className="px-6 py-3">
                  <Skeleton className="h-4 w-24" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b">
                {[...Array(8)].map((_, j) => (
                  <td key={j} className="px-6 py-4">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
)

export default function OrdersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  // Auto-refresh feature
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(5) // minutes

  // Dialog states
  const [updateOrderId, setUpdateOrderId] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState('')
  const [updateReason, setUpdateReason] = useState('')
  const [refundOrderId, setRefundOrderId] = useState<string | null>(null)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      fetchOrders()
      toast.success('Orders refreshed automatically', {
        duration: 2000,
        icon: '🔄'
      })
    }, refreshInterval * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, statusFilter, paymentFilter, priorityFilter, sortBy, sortOrder, currentPage])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + R to refresh
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault()
        fetchOrders()
      }
      // Ctrl/Cmd + E to export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault()
        exportOrders()
      }
      // Ctrl/Cmd + F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        document.getElementById('search-input')?.focus()
      }
      // Escape to clear selection
      if (e.key === 'Escape') {
        setSelectedOrders([])
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Responsive breakpoint detection
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setViewMode('cards')
      } else {
        setViewMode('table')
      }
    }
    
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  useEffect(() => {
    if (session?.user?.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchOrders()
  }, [session, router, currentPage, statusFilter, paymentFilter, priorityFilter, sortBy, sortOrder])

  const fetchOrders = useCallback(async () => {
    try {
      setRefreshing(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sortBy,
        sortOrder
      })
      
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      if (paymentFilter && paymentFilter !== 'all') params.append('paymentStatus', paymentFilter)
      if (priorityFilter && priorityFilter !== 'all') params.append('priority', priorityFilter)
      
      const response = await fetch(`/api/orders?${params}`)
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders)
        setTotalPages(data.pagination.pages)
        if (!loading) {
          toast.success('Orders refreshed')
        }
      } else {
        toast.error('Failed to fetch orders')
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Error fetching orders')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [currentPage, statusFilter, paymentFilter, priorityFilter, sortBy, sortOrder, loading])

  const updateOrderStatus = async (orderId: string, newStatus: string, reason?: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          statusChangeReason: reason
        })
      })
      
      if (response.ok) {
        toast.success(`Order status updated to ${newStatus}`)
        fetchOrders()
        setUpdateOrderId(null)
        setUpdateReason('')
      } else {
        toast.error('Failed to update order status')
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Error updating order status')
    }
  }

  const createRefund = async (orderId: string, amount: number, reason: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}?action=refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason })
      })
      
      if (response.ok) {
        toast.success('Refund request created successfully')
        fetchOrders()
        setRefundOrderId(null)
        setRefundAmount('')
        setRefundReason('')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create refund')
      }
    } catch (error) {
      console.error('Error creating refund:', error)
      toast.error('Error creating refund')
    }
  }

  const handleBulkAction = async () => {
    if (!bulkAction || selectedOrders.length === 0) return
    
    try {
      await Promise.all(
        selectedOrders.map(orderId => 
          updateOrderStatus(orderId, bulkAction)
        )
      )
      setSelectedOrders([])
      setBulkAction('')
      toast.success(`Bulk action completed for ${selectedOrders.length} orders`)
    } catch (error) {
      console.error('Error with bulk action:', error)
      toast.error('Error with bulk action')
    }
  }

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const handleSelectAll = () => {
    setSelectedOrders(
      selectedOrders.length === orders.length 
        ? [] 
        : orders.map(o => o.id)
    )
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.user.name && order.user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.user.email && order.user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesSearch
  })

  const statusCounts = {
    all: filteredOrders.length,
    PENDING: filteredOrders.filter(o => o.status === 'PENDING').length,
    CONFIRMED: filteredOrders.filter(o => o.status === 'CONFIRMED').length,
    PROCESSING: filteredOrders.filter(o => o.status === 'PROCESSING').length,
    SHIPPED: filteredOrders.filter(o => o.status === 'SHIPPED').length,
    DELIVERED: filteredOrders.filter(o => o.status === 'DELIVERED').length,
    CANCELLED: filteredOrders.filter(o => o.status === 'CANCELLED').length,
    REFUNDED: filteredOrders.filter(o => o.status === 'REFUNDED').length
  }

  // Smart Insights
  const orderInsights = useMemo(() => {
    const insights: Array<{ type: 'success' | 'warning' | 'info'; message: string }> = []
    
    const pendingCount = statusCounts.PENDING
    const urgentOrders = filteredOrders.filter(o => o.priority === 'URGENT').length
    const failedPayments = filteredOrders.filter(o => o.paymentStatus === 'FAILED').length
    const oldPending = filteredOrders.filter(o => {
      const daysSince = (Date.now() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      return o.status === 'PENDING' && daysSince > 2
    }).length

    if (pendingCount > 10) {
      insights.push({ 
        type: 'warning', 
        message: `${pendingCount} orders pending confirmation. Review and process them.` 
      })
    }
    
    if (urgentOrders > 0) {
      insights.push({ 
        type: 'warning', 
        message: `${urgentOrders} urgent orders require immediate attention!` 
      })
    }
    
    if (failedPayments > 0) {
      insights.push({ 
        type: 'warning', 
        message: `${failedPayments} orders have failed payments. Contact customers.` 
      })
    }
    
    if (oldPending > 0) {
      insights.push({ 
        type: 'info', 
        message: `${oldPending} orders pending for more than 2 days.` 
      })
    }
    
    if (statusCounts.DELIVERED > 50) {
      insights.push({ 
        type: 'success', 
        message: `Great job! ${statusCounts.DELIVERED} orders delivered successfully! 🎉` 
      })
    }
    
    return insights
  }, [filteredOrders, statusCounts])

  // Quick Stats
  const orderStats = useMemo(() => {
    const total = filteredOrders.reduce((sum, o) => sum + o.total, 0)
    const avgOrderValue = filteredOrders.length > 0 ? total / filteredOrders.length : 0
    const todayOrders = filteredOrders.filter(o => {
      const today = new Date().setHours(0, 0, 0, 0)
      const orderDate = new Date(o.createdAt).setHours(0, 0, 0, 0)
      return orderDate === today
    }).length

    return {
      totalRevenue: total,
      avgOrderValue,
      todayOrders,
      totalOrders: filteredOrders.length
    }
  }, [filteredOrders])

  // Active Filters
  const activeFilters = useMemo(() => {
    const filters = []
    if (statusFilter !== 'all') filters.push({ key: 'status', value: statusFilter, setter: setStatusFilter })
    if (paymentFilter !== 'all') filters.push({ key: 'payment', value: paymentFilter, setter: setPaymentFilter })
    if (priorityFilter !== 'all') filters.push({ key: 'priority', value: priorityFilter, setter: setPriorityFilter })
    if (searchTerm) filters.push({ key: 'search', value: searchTerm, setter: setSearchTerm })
    return filters
  }, [statusFilter, paymentFilter, priorityFilter, searchTerm])

  const exportOrders = async () => {
    try {
      const response = await fetch('/api/orders/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: statusFilter,
          paymentStatus: paymentFilter,
          priority: priorityFilter
        })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        toast.success('Orders exported successfully')
      }
    } catch (error) {
      toast.error('Failed to export orders')
    }
  }

  const printInvoice = (orderId: string) => {
    window.open(`/dashboard/orders/${orderId}/invoice`, '_blank')
  }

  // Mobile Filter Sheet Component
  const MobileFilterSheet = () => (
    <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden">
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {activeFilters.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilters.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Filters & Search</SheetTitle>
          <SheetDescription>
            Filter and search orders
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 mt-6">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              id="search-input"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium mb-2 block">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="SHIPPED">Shipped</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Payment</Label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Priority</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Sort By</Label>
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-')
                setSortBy(field)
                setSortOrder(order)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt-desc">Newest First</SelectItem>
                  <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                  <SelectItem value="total-desc">Highest Amount</SelectItem>
                  <SelectItem value="total-asc">Lowest Amount</SelectItem>
                  <SelectItem value="orderNumber-asc">Order Number</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )

  // Mobile Order Card Component
  const OrderCard = ({ order }: { order: Order }) => {
    const StatusIcon = statusIcons[order.status as keyof typeof statusIcons]
    
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedOrders.includes(order.id)}
                onCheckedChange={() => handleSelectOrder(order.id)}
              />
              <div>
                <div className="font-semibold text-lg">#{order.orderNumber}</div>
                <div className="text-sm text-gray-600">{formatDate(order.createdAt, '')}</div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {statusActions[order.status as keyof typeof statusActions].map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => {
                      setUpdateOrderId(order.id)
                      setUpdateStatus(status)
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Mark as {status}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => printInvoice(order.id)}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print Invoice
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/orders/${order.id}`}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{order.user.name || 'Unknown'}</span>
              </div>
              <div className="text-lg font-bold">{formatPrice(order.total)}</div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <StatusIcon className="w-4 h-4 text-gray-400" />
                <Badge 
                  variant="secondary"
                  className={ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS]}
                >
                  {order.status}
                </Badge>
              </div>
              <Badge 
                variant="secondary"
                className={
                  order.paymentStatus === 'PAID' 
                    ? 'bg-green-100 text-green-800'
                    : order.paymentStatus === 'FAILED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }
              >
                {order.paymentStatus}
              </Badge>
              <Badge 
                variant="outline" 
                className={priorityColors[order.priority as keyof typeof priorityColors]}
              >
                {order.priority}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                {order.items.length} items
              </div>
              {order.trackingNumber && (
                <div className="text-blue-600">
                  Tracking: {order.trackingNumber}
                </div>
              )}
            </div>

            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href={`/dashboard/orders/${order.id}`}>
                <Eye className="w-4 h-4 mr-2" />
                View Full Details
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        {/* Header skeleton */}
        <div className="flex justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <OrderTableSkeleton />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-full mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <CircleStar className="w-7 h-7 text-blue-600" />
            Order Management
          </h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            Manage orders, update statuses, and track fulfillment
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <kbd className="px-2 py-1 bg-gray-100 border rounded">Ctrl+R</kbd>
            <span>Refresh</span>
            <kbd className="px-2 py-1 bg-gray-100 border rounded">Ctrl+E</kbd>
            <span>Export</span>
            <kbd className="px-2 py-1 bg-gray-100 border rounded">Ctrl+F</kbd>
            <span>Search</span>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
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
          {!isMobile && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
              >
                {viewMode === 'table' ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
              </Button>
            </div>
          )}
          <Button 
            onClick={fetchOrders} 
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportOrders} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Smart Insights Banner */}
      {orderInsights.length > 0 && (
        <div className="space-y-2">
          {orderInsights.map((insight, index) => (
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

      {/* Quick Stats Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Total Revenue
              </p>
              <p className="text-xl font-bold text-gray-900">
                {formatPrice(orderStats.totalRevenue)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Avg Order Value
              </p>
              <p className="text-xl font-bold text-gray-900">
                {formatPrice(orderStats.avgOrderValue)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Today&#39;s Orders
              </p>
              <p className="text-xl font-bold text-gray-900">{orderStats.todayOrders}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                <Package className="w-3 h-3" />
                Total Orders
              </p>
              <p className="text-xl font-bold text-gray-900">{orderStats.totalOrders}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Overview Cards - Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-4">
        {Object.entries(statusCounts).map(([status, count]) => (
          <Card 
            key={status} 
            className={`cursor-pointer hover:shadow-md transition-shadow ${
              statusFilter === status ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setStatusFilter(status)}
          >
            <CardContent className="p-3 md:p-4">
              <div className="text-center">
                <div className="text-lg md:text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-xs md:text-sm text-gray-600 capitalize">
                  {status === 'all' ? 'Total' : status.toLowerCase()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Filters Display */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600">Active filters:</span>
          {activeFilters.map((filter) => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-red-100 transition-colors"
              onClick={() => filter.setter(filter.key === 'search' ? '' : 'all')}
            >
              {filter.key}: {filter.value}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('all')
              setPaymentFilter('all')
              setPriorityFilter('all')
              setSearchTerm('')
            }}
            className="h-6 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Filters - Desktop/Mobile Responsive */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters</CardTitle>
            <div className="flex items-center gap-2">
              <MobileFilterSheet />
              {!isMobile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFiltersOpen(!filtersOpen)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  {filtersOpen ? 'Hide' : 'Show'} Filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        {/* Desktop Filters */}
        <Collapsible open={filtersOpen || !isMobile} onOpenChange={setFiltersOpen}>
          <CollapsibleContent>
            <CardContent className="space-y-4 hidden md:block">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    id="search-input"
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                    <SelectItem value="PROCESSING">Processing</SelectItem>
                    <SelectItem value="SHIPPED">Shipped</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="REFUNDED">Refunded</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                    <SelectItem value="REFUNDED">Refunded</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                  const [field, order] = value.split('-')
                  setSortBy(field)
                  setSortOrder(order)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt-desc">Newest First</SelectItem>
                    <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                    <SelectItem value="total-desc">Highest Amount</SelectItem>
                    <SelectItem value="total-asc">Lowest Amount</SelectItem>
                    <SelectItem value="orderNumber-asc">Order Number</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bulk Actions */}
              {selectedOrders.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedOrders.length} orders selected
                  </span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={bulkAction} onValueChange={setBulkAction}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Bulk Actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CONFIRMED">Mark as Confirmed</SelectItem>
                        <SelectItem value="PROCESSING">Mark as Processing</SelectItem>
                        <SelectItem value="SHIPPED">Mark as Shipped</SelectItem>
                        <SelectItem value="DELIVERED">Mark as Delivered</SelectItem>
                        <SelectItem value="CANCELLED">Mark as Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleBulkAction}
                      disabled={!bulkAction}
                      size="sm"
                    >
                      Apply
                    </Button>
                    <Button
                      onClick={() => setSelectedOrders([])}
                      variant="outline"
                      size="sm"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Empty State */}
      {filteredOrders.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || activeFilters.length > 0 ? 'No orders found' : 'No orders yet'}
            </h3>
            <p className="text-gray-500 mb-6 text-center max-w-md">
              {searchTerm || activeFilters.length > 0
                ? 'Try adjusting your filters or search term to find what you\'re looking for.'
                : 'Orders will appear here once customers start placing orders.'
              }
            </p>
            {(searchTerm || activeFilters.length > 0) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setPaymentFilter('all')
                  setPriorityFilter('all')
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Orders Display - Table or Cards based on screen size and preference */}
      {filteredOrders.length > 0 && (viewMode === 'cards' || isMobile ? (
        /* Mobile Card View */
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Orders ({filteredOrders.length})</h2>
            {selectedOrders.length > 0 && (
              <Button
                onClick={() => setSelectedOrders([])}
                variant="outline"
                size="sm"
              >
                Clear Selection
              </Button>
            )}
          </div>
          <ScrollArea className="h-[calc(100vh-400px)]">
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          </ScrollArea>
        </div>
      ) : (
        /* Desktop Table View */
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Orders ({filteredOrders.length})</CardTitle>
              <CardDescription>Manage and track all orders</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedOrders.length === orders.length && orders.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label className="text-sm">Select All</Label>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-12 px-6 py-3"></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => {
                    const StatusIcon = statusIcons[order.status as keyof typeof statusIcons]
                    
                    return (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <Checkbox
                            checked={selectedOrders.includes(order.id)}
                            onCheckedChange={() => handleSelectOrder(order.id)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                #{order.orderNumber}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <Package className="w-3 h-3 mr-1" />
                                {order.items.length} items
                              </div>
                              {order.trackingNumber && (
                                <div className="text-xs text-blue-600">
                                  Tracking: {order.trackingNumber}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {order.user.name || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {order.user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-gray-900 flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDate(order.createdAt, '')}
                            </div>
                            <Badge 
                              variant="secondary" 
                              className={priorityColors[order.priority as keyof typeof priorityColors]}
                            >
                              {order.priority}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <StatusIcon className="w-4 h-4 mr-2 text-gray-400" />
                            <Badge 
                              variant="secondary"
                              className={ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS]}
                            >
                              {order.status}
                            </Badge>
                          </div>
                          {order.estimatedDelivery && (
                            <div className="text-xs text-gray-500 mt-1">
                              Est: {formatDate(order.estimatedDelivery, '')}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            variant="secondary"
                            className={
                              order.paymentStatus === 'PAID' 
                                ? 'bg-green-100 text-green-800'
                                : order.paymentStatus === 'FAILED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }
                          >
                            {order.paymentStatus}
                          </Badge>
                          {order.refunds && order.refunds.length > 0 && (
                            <div className="text-xs text-red-600 mt-1">
                              {order.refunds.length} refund(s)
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatPrice(order.total)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Subtotal: {formatPrice(order.subtotal)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/dashboard/orders/${order.id}`}>
                                <Eye className="w-4 h-4" />
                              </Link>
                            </Button>
                            
                            {/* Quick Actions Dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                
                                {statusActions[order.status as keyof typeof statusActions].map((status) => (
                                  <DropdownMenuItem
                                    key={status}
                                    onClick={() => {
                                      setUpdateOrderId(order.id)
                                      setUpdateStatus(status)
                                    }}
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Mark as {status}
                                  </DropdownMenuItem>
                                ))}
                                
                                {order.status === 'DELIVERED' && order.paymentStatus === 'PAID' && (
                                  <DropdownMenuItem
                                    onClick={() => setRefundOrderId(order.id)}
                                  >
                                    <DollarSign className="w-4 h-4 mr-2" />
                                    Create Refund
                                  </DropdownMenuItem>
                                )}
                                
                                <DropdownMenuItem onClick={() => printInvoice(order.id)}>
                                  <Printer className="w-4 h-4 mr-2" />
                                  Print Invoice
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/orders/${order.id}`}>
                                    <FileText className="w-4 h-4 mr-2" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 md:px-6 py-3 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      First
                    </Button>
                    <Button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    
                    {/* Page numbers for desktop */}
                    <div className="hidden sm:flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = Math.max(1, currentPage - 2) + i
                        if (page > totalPages) return null
                        return (
                          <Button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            className="w-10"
                          >
                            {page}
                          </Button>
                        )
                      })}
                    </div>
                    
                    <Button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                    <Button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                    >
                      Last
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Update Order Status Dialog */}
      <Dialog open={!!updateOrderId} onOpenChange={() => setUpdateOrderId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Change the status of order #{orders.find(o => o.id === updateOrderId)?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Status</Label>
              <Select value={updateStatus} onValueChange={setUpdateStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {updateOrderId && statusActions[orders.find(o => o.id === updateOrderId)?.status as keyof typeof statusActions]?.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason (Optional)</Label>
              <Textarea
                value={updateReason}
                onChange={(e) => setUpdateReason(e.target.value)}
                placeholder="Enter reason for status change..."
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setUpdateOrderId(null)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={() => updateOrderStatus(updateOrderId!, updateStatus, updateReason)}
              disabled={!updateStatus}
              className="w-full sm:w-auto"
            >
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Refund Dialog */}
      <Dialog open={!!refundOrderId} onOpenChange={() => setRefundOrderId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Refund</DialogTitle>
            <DialogDescription>
              Create a refund for order #{orders.find(o => o.id === refundOrderId)?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Refund Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="0.00"
              />
              {refundOrderId && (
                <p className="text-sm text-gray-500 mt-1">
                  Maximum: {formatPrice(orders.find(o => o.id === refundOrderId)?.total || 0)}
                </p>
              )}
            </div>
            <div>
              <Label>Refund Reason</Label>
              <Textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Enter reason for refund..."
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setRefundOrderId(null)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={() => createRefund(refundOrderId!, parseFloat(refundAmount), refundReason)}
              disabled={!refundAmount || parseFloat(refundAmount) <= 0}
              className="w-full sm:w-auto"
            >
              Create Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loading overlay for mobile */}
      {refreshing && isMobile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span>Refreshing orders...</span>
          </div>
        </div>
      )}
    </div>
  )
} 