'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'

// Lucide React icons
import {
  Clock, AlertTriangle, CheckCircle, XCircle, 
  TrendingUp, DollarSign, Package, User,
  Calendar, Search, RefreshCw,
  MoreHorizontal, Eye, Zap,
  Tag, MapPin, Play, Pause, Bell, AlertCircle,
  ShoppingBag, Image as ImageIcon
} from 'lucide-react'

import { formatPrice, formatDate } from '@/lib/utils'

// Interfaces
interface PendingOrder {
  id: string
  orderNumber: string
  user: {
    id: string
    name: string | null
    email: string | null
  }
  total: number
  subtotal: number
  discount: number
  priority: string
  source: string
  createdAt: string
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
      category?: {
        name: string
      }
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
  couponCode?: string | null
  coupon?: {
    code: string
    type: string
    value: number
    description?: string
  }
  paymentStatus: string
  _count: {
    items: number
  }
}

interface QuickStats {
  total: number
  urgent: number
  high: number
  normal: number
  low: number
  averageValue: number
  totalValue: number
  oldestPendingDays: number
  withCoupons: number
}

const priorityColors = {
  URGENT: 'bg-red-500 text-white border-red-600',
  HIGH: 'bg-orange-500 text-white border-orange-600',
  NORMAL: 'bg-cyan-500 text-white border-cyan-600',
  LOW: 'bg-gray-500 text-white border-gray-600'
}

const priorityIcons = {
  URGENT: AlertTriangle,
  HIGH: TrendingUp,
  NORMAL: Clock,
  LOW: Clock
}

export default function PendingOrdersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  
  const [orders, setOrders] = useState<PendingOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [ageFilter, setAgeFilter] = useState('all')
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('asc')
  
  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(2)
  
  // Dialog states
  const [quickActionOrderId, setQuickActionOrderId] = useState<string | null>(null)
  const [actionStatus, setActionStatus] = useState('')
  const [actionReason, setActionReason] = useState('')

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      fetchPendingOrders()
      toast.info('Pending orders refreshed', {
        duration: 2000,
        icon: '🔄'
      })
    }, refreshInterval * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  useEffect(() => {
    if (session?.user?.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchPendingOrders()
  }, [session, router, sortBy, sortOrder])

  const fetchPendingOrders = useCallback(async () => {
    try {
      setRefreshing(true)
      const params = new URLSearchParams({
        status: 'PENDING',
        limit: '100',
        sortBy,
        sortOrder
      })
      
      const response = await fetch(`/api/orders?${params}`)
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders)
        if (!loading) {
          playNotificationSound()
        }
      } else {
        toast.error('Failed to fetch pending orders')
      }
    } catch (error) {
      console.error('Error fetching pending orders:', error)
      toast.error('Error fetching pending orders')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [sortBy, sortOrder, loading])

  const playNotificationSound = () => {
    // Optional: Add sound notification for new orders
  }

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
        toast.success(`Order ${newStatus.toLowerCase()} successfully!`, {
          icon: '✅'
        })
        fetchPendingOrders()
        setQuickActionOrderId(null)
        setActionReason('')
      } else {
        toast.error('Failed to update order status')
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Error updating order status')
    }
  }

  const handleBulkConfirm = async () => {
    if (selectedOrders.length === 0) return
    
    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulkStatusUpdate',
          orderIds: selectedOrders,
          data: {
            status: 'CONFIRMED',
            reason: 'Bulk confirmation from pending page'
          }
        })
      })

      if (response.ok) {
        toast.success(`${selectedOrders.length} orders confirmed!`, {
          icon: '✅'
        })
        setSelectedOrders([])
        fetchPendingOrders()
      } else {
        toast.error('Bulk confirmation failed')
      }
    } catch (error) {
      console.error('Error with bulk confirmation:', error)
      toast.error('Error with bulk confirmation')
    }
  }

  const handleBulkCancel = async () => {
    if (selectedOrders.length === 0) return
    
    if (!confirm(`Are you sure you want to cancel ${selectedOrders.length} orders?`)) {
      return
    }
    
    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulkStatusUpdate',
          orderIds: selectedOrders,
          data: {
            status: 'CANCELLED',
            reason: 'Bulk cancellation from pending page'
          }
        })
      })

      if (response.ok) {
        toast.success(`${selectedOrders.length} orders cancelled`, {
          icon: '❌'
        })
        setSelectedOrders([])
        fetchPendingOrders()
      } else {
        toast.error('Bulk cancellation failed')
      }
    } catch (error) {
      console.error('Error with bulk cancellation:', error)
      toast.error('Error with bulk cancellation')
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
      selectedOrders.length === filteredOrders.length 
        ? [] 
        : filteredOrders.map(o => o.id)
    )
  }

  const getOrderAge = (createdAt: string) => {
    const hours = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60))
    return hours
  }

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = !searchTerm || 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.user.name && order.user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.user.email && order.user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.couponCode && order.couponCode.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesPriority = priorityFilter === 'all' || order.priority === priorityFilter
      const matchesSource = sourceFilter === 'all' || order.source === sourceFilter
      
      let matchesAge = true
      if (ageFilter !== 'all') {
        const hours = getOrderAge(order.createdAt)
        if (ageFilter === 'new') matchesAge = hours < 1
        else if (ageFilter === 'recent') matchesAge = hours >= 1 && hours < 24
        else if (ageFilter === 'old') matchesAge = hours >= 24 && hours < 48
        else if (ageFilter === 'critical') matchesAge = hours >= 48
      }
      
      return matchesSearch && matchesPriority && matchesSource && matchesAge
    })
  }, [orders, searchTerm, priorityFilter, sourceFilter, ageFilter])

  const stats: QuickStats = useMemo(() => {
    const urgent = filteredOrders.filter(o => o.priority === 'URGENT').length
    const high = filteredOrders.filter(o => o.priority === 'HIGH').length
    const normal = filteredOrders.filter(o => o.priority === 'NORMAL').length
    const low = filteredOrders.filter(o => o.priority === 'LOW').length
    const totalValue = filteredOrders.reduce((sum, o) => sum + o.total, 0)
    const averageValue = filteredOrders.length > 0 ? totalValue / filteredOrders.length : 0
    const withCoupons = filteredOrders.filter(o => o.couponCode).length
    
    let oldestPendingDays = 0
    if (filteredOrders.length > 0) {
      const oldestOrder = filteredOrders.reduce((oldest, order) => {
        return new Date(order.createdAt) < new Date(oldest.createdAt) ? order : oldest
      })
      oldestPendingDays = Math.floor((Date.now() - new Date(oldestOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    }
    
    return {
      total: filteredOrders.length,
      urgent,
      high,
      normal,
      low,
      averageValue,
      totalValue,
      oldestPendingDays,
      withCoupons
    }
  }, [filteredOrders])

  const insights = useMemo(() => {
    const insights: Array<{ type: 'success' | 'warning' | 'error' | 'info'; message: string }> = []
    
    if (stats.urgent > 0) {
      insights.push({ 
        type: 'error', 
        message: `⚠️ ${stats.urgent} URGENT orders need immediate action!` 
      })
    }
    
    if (stats.oldestPendingDays > 2) {
      insights.push({ 
        type: 'warning', 
        message: `⏰ Oldest pending order is ${stats.oldestPendingDays} days old - review immediately!` 
      })
    }
    
    if (stats.high > 5) {
      insights.push({ 
        type: 'warning', 
        message: `📊 ${stats.high} high-priority orders awaiting confirmation` 
      })
    }
    
    if (stats.total > 20) {
      insights.push({ 
        type: 'info', 
        message: `📦 ${stats.total} pending orders - consider batch processing` 
      })
    }
    
    if (stats.withCoupons > 0) {
      insights.push({ 
        type: 'info', 
        message: `🎟️ ${stats.withCoupons} orders with active coupons` 
      })
    }
    
    if (stats.total === 0) {
      insights.push({ 
        type: 'success', 
        message: '🎉 All caught up! No pending orders at the moment.' 
      })
    }
    
    return insights
  }, [stats])

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
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
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-full mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-7 h-7 text-orange-600" />
            Pending Orders
            {stats.total > 0 && (
              <Badge className="bg-orange-600 hover:bg-orange-700 text-white">
                {stats.total}
              </Badge>
            )}
          </h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            Review and process orders awaiting confirmation
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border">
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              id="auto-refresh-pending"
            />
            <Label 
              htmlFor="auto-refresh-pending" 
              className="text-sm cursor-pointer flex items-center gap-1"
            >
              {autoRefresh ? (
                <>
                  <Play className="w-3 h-3 text-green-600" />
                  <span className="text-green-600 font-medium">Auto {refreshInterval}m</span>
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3 text-gray-600" />
                  <span className="font-medium">Manual</span>
                </>
              )}
            </Label>
          </div>

          <Button 
            onClick={fetchPendingOrders} 
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
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
              className={
                insight.type === 'success' ? 'border-green-500 bg-green-50' :
                insight.type === 'error' ? 'border-red-500 bg-red-50' :
                insight.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                'border-blue-500 bg-blue-50'
              }
            >
              {insight.type === 'success' && <CheckCircle className="h-4 w-4 text-green-700" />}
              {insight.type === 'error' && <AlertTriangle className="h-4 w-4 text-red-700" />}
              {insight.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-700" />}
              {insight.type === 'info' && <Bell className="h-4 w-4 text-blue-700" />}
              <AlertDescription className={
                insight.type === 'success' ? 'text-green-800 font-medium' :
                insight.type === 'error' ? 'text-red-800 font-medium' :
                insight.type === 'warning' ? 'text-yellow-800 font-medium' :
                'text-blue-800 font-medium'
              }>
                {insight.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-5 h-5" />
              <Badge className="bg-white/20 text-neture-600 border-0">
                Total
              </Badge>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs opacity-90">Pending Orders</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5" />
              <Badge className="bg-white/20 text-neture-600 border-0">
                Urgent
              </Badge>
            </div>
            <div className="text-2xl font-bold">{stats.urgent}</div>
            <p className="text-xs opacity-90">Immediate Action</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5" />
              <Badge className="bg-white/20 text-neture-600 border-0">
                High
              </Badge>
            </div>
            <div className="text-2xl font-bold">{stats.high}</div>
            <p className="text-xs opacity-90">High Priority</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5" />
              <Badge className="bg-white/20 text-neture-600 border-0">
                Value
              </Badge>
            </div>
            <div className="text-2xl font-bold">${Math.round(stats.totalValue)}</div>
            <p className="text-xs opacity-90">Total Value</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-5 h-5" />
              <Badge className="bg-white/20 text-neture-600 border-0">
                Age
              </Badge>
            </div>
            <div className="text-2xl font-bold">{stats.oldestPendingDays}d</div>
            <p className="text-xs opacity-90">Oldest Order</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Tag className="w-5 h-5" />
              <Badge className="bg-white/20 text-neture-600 border-0">
                Coupons
              </Badge>
            </div>
            <div className="text-2xl font-bold">{stats.withCoupons}</div>
            <p className="text-xs opacity-90">With Discounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters & Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="WEBSITE">Website</SelectItem>
                <SelectItem value="MOBILE_APP">Mobile App</SelectItem>
                <SelectItem value="ADMIN_PANEL">Admin Panel</SelectItem>
              </SelectContent>
            </Select>

            <Select value={ageFilter} onValueChange={setAgeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Age" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ages</SelectItem>
                <SelectItem value="new">&lt; 1 hour</SelectItem>
                <SelectItem value="recent">1-24 hours</SelectItem>
                <SelectItem value="old">1-2 days</SelectItem>
                <SelectItem value="critical">&gt; 2 days</SelectItem>
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
                <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                <SelectItem value="createdAt-desc">Newest First</SelectItem>
                <SelectItem value="total-desc">Highest Value</SelectItem>
                <SelectItem value="total-asc">Lowest Value</SelectItem>
                <SelectItem value="priority-desc">Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedOrders.length > 0 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-500">
              <span className="text-sm font-semibold text-blue-900">
                {selectedOrders.length} orders selected
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  onClick={handleBulkConfirm}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm All
                </Button>
                <Button
                  onClick={handleBulkCancel}
                  size="sm"
                  variant="destructive"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel All
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
      </Card>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              All Clear!
            </h3>
            <p className="text-gray-600 text-center max-w-md">
              No pending orders match your filters. Great job keeping up with orders!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {filteredOrders.length} Pending {filteredOrders.length === 1 ? 'Order' : 'Orders'}
              </h2>
              <Checkbox
                checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <Label className="text-sm text-gray-600 cursor-pointer" onClick={handleSelectAll}>
                Select All
              </Label>
            </div>
          </div>

          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const PriorityIcon = priorityIcons[order.priority as keyof typeof priorityIcons]
              const ageHours = getOrderAge(order.createdAt)
              const ageDays = Math.floor(ageHours / 24)
              const ageDisplay = ageDays > 0 
                ? `${ageDays}d ${ageHours % 24}h`
                : `${ageHours}h`
              
              return (
                <Card 
                  key={order.id} 
                  className="hover:shadow-md transition-shadow border-l-4"
                  style={{
                    borderLeftColor: 
                      order.priority === 'URGENT' ? '#ef4444' :
                      order.priority === 'HIGH' ? '#f97316' :
                      order.priority === 'NORMAL' ? '#399ddbff' :
                      '#6b7280'
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={() => handleSelectOrder(order.id)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <Link 
                                href={`/dashboard/orders/${order.id}`}
                                className="text-lg font-bold text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {order.orderNumber}
                              </Link>
                              
                              <Badge 
                                className={priorityColors[order.priority as keyof typeof priorityColors]}
                              >
                                <PriorityIcon className="w-3 h-3 mr-1" />
                                {order.priority}
                              </Badge>
                              
                              <Badge variant="outline" className="text-xs font-medium border-gray-400">
                                {order.source.replace('_', ' ')}
                              </Badge>
                              
                              {order.couponCode && (
                                <Badge className="bg-green-600 hover:bg-green-700 text-white">
                                  <Tag className="w-3 h-3 mr-1" />
                                  {order.couponCode}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                              <span className="flex items-center gap-1.5 font-medium">
                                <User className="w-4 h-4" />
                                {order.user.name || order.user.email}
                              </span>
                              
                              <span className="flex items-center gap-1.5">
                                <Package className="w-4 h-4" />
                                {order._count.items} {order._count.items === 1 ? 'item' : 'items'}
                              </span>
                              
                              <span className="flex items-center gap-1.5 text-orange-600 font-medium">
                                <Clock className="w-4 h-4" />
                                {ageDisplay} ago
                              </span>
                              
                              {order.shippingAddress && (
                                <span className="flex items-center gap-1.5">
                                  <MapPin className="w-4 h-4" />
                                  {order.shippingAddress.city}, {order.shippingAddress.state}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">
                              {formatPrice(order.total)}
                            </div>
                            {order.discount > 0 && (
                              <div className="text-sm font-semibold text-green-600">
                                -{formatPrice(order.discount)} saved
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              Subtotal: {formatPrice(order.subtotal)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Order Items */}
                        <div className="bg-gray-50 rounded-lg p-3 border">
                          <div className="flex items-center gap-2 mb-2">
                            <ShoppingBag className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-semibold text-gray-700">Order Items</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {order.items.map((item) => (
                              <div 
                                key={item.id}
                                className="flex items-center gap-3 bg-white rounded-lg p-2 border hover:border-blue-300 transition-colors"
                              >
                                {item.product.images[0] ? (
                                  <img 
                                    src={item.product.images[0]} 
                                    alt={item.product.name}
                                    className="w-14 h-14 object-cover rounded border"
                                  />
                                ) : (
                                  <div className="w-14 h-14 bg-gray-100 rounded border flex items-center justify-center">
                                    <ImageIcon className="w-6 h-6 text-gray-400" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {item.product.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Qty: {item.quantity} × {formatPrice(item.price)}
                                  </p>
                                  <p className="text-xs font-semibold text-gray-700">
                                    {formatPrice(item.quantity * item.price)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap pt-2">
                          <Button
  size="sm"
  onClick={() => {
    setQuickActionOrderId(order.id)
    setActionStatus('CONFIRMED')
  }}
  className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 shadow-sm transition-all"
>
  <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
  Confirm Order
</Button>

                          
                          <Button
                            size="sm"
                            onClick={() => {
                              setQuickActionOrderId(order.id)
                              setActionStatus('CANCELLED')
                            }}
                              className="bg-rose-500 hover:bg-rose-600 text-white shadow-sm hover:shadow-md transition-all"

                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                          
                          <Link href={`/dashboard/orders/${order.id}`}>
                            <Button size="sm" variant="outline" className="border-2">
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                          </Link>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => {
                                setQuickActionOrderId(order.id)
                                setActionStatus('PROCESSING')
                              }}>
                                <Zap className="w-4 h-4 mr-2" />
                                Mark as Processing
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                navigator.clipboard.writeText(order.orderNumber)
                                toast.success('Order number copied!')
                              }}>
                                Copy Order Number
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                if (order.user.email) {
                                  navigator.clipboard.writeText(order.user.email)
                                  toast.success('Email copied!')
                                }
                              }}>
                                Copy Customer Email
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick Action Dialog */}
      <Dialog open={quickActionOrderId !== null} onOpenChange={(open) => {
        if (!open) {
          setQuickActionOrderId(null)
          setActionStatus('')
          setActionReason('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {actionStatus === 'CONFIRMED' && '✅ Confirm Order'}
              {actionStatus === 'CANCELLED' && '❌ Cancel Order'}
              {actionStatus === 'PROCESSING' && '⚡ Process Order'}
            </DialogTitle>
            <DialogDescription className="text-base">
              {actionStatus === 'CONFIRMED' && 'This will move the order to confirmed status and begin processing.'}
              {actionStatus === 'CANCELLED' && 'This will cancel the order and restore product stock.'}
              {actionStatus === 'PROCESSING' && 'This will mark the order as being processed.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="action-reason" className="text-sm font-semibold">
                Reason (optional)
              </Label>
              <Textarea
                id="action-reason"
                placeholder="Add a note about this status change..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setQuickActionOrderId(null)
                setActionStatus('')
                setActionReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (quickActionOrderId) {
                  updateOrderStatus(quickActionOrderId, actionStatus, actionReason)
                }
              }}
              className={
                actionStatus === 'CONFIRMED' ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 shadow-sm transition-all' :
                actionStatus === 'CANCELLED' ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm hover:shadow-md transition-all' :
                'bg-blue-600 hover:bg-blue-700'
              }
            >
              {actionStatus === 'CONFIRMED' && 'Confirm Order'}
              {actionStatus === 'CANCELLED' && 'Cancel Order'}
              {actionStatus === 'PROCESSING' && 'Start Processing'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}