/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
'use client'
import { useEffect, useState, use, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft, Package, User, MapPin, CreditCard, Truck,
  Calendar, Edit, Save, X, CheckCircle, Clock,
  AlertCircle, RefreshCw, Download, Phone, Mail,
  MoreHorizontal, Copy, Eye, ExternalLink, Printer,
  MessageSquare, DollarSign, TrendingUp, History,
  FileText, Send, Package2
} from 'lucide-react'

// shadcn/ui imports
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

import { formatPrice, formatDate, ORDER_STATUS_COLORS } from '@/lib/utils'

interface OrderNote {
  id: string
  content: string
  isInternal: boolean
  createdAt: string
  author: {
    name: string | null
    email: string | null
  }
}

interface OrderDetail {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  total: number
  subtotal: number
  tax: number
  shipping: number
  carrier?: string
  trackingNumber?: string
  createdAt: string
  updatedAt: string
  shippedAt?: string
  deliveredAt?: string
  user: {
    id: string
    name: string | null
    email: string | null
    image?: string | null
  }
  shippingAddress?: {
    id: string
    firstName: string
    lastName: string
    company?: string
    address1: string
    address2?: string
    city: string
    state: string
    zipCode: string
    country: string
    phone?: string
  }
  items: Array<{
    id: string
    quantity: number
    price: number
    product: {
      id: string
      name: string
      images: string[]
      slug: string
      price: number
      sku?: string
      category?: {
        name: string
      }
    }
  }>
  notes?: OrderNote[]  // ✅ CHANGED: This should be OrderNote[], not string
  statusHistory?: Array<{
    id: string
    fromStatus: string
    toStatus: string
    timestamp: string
    changedByUser?: {
      name: string
      email: string
    }
  }>
}

const statusFlow = {
  PENDING: { next: ['CONFIRMED', 'CANCELLED'], color: 'yellow', progress: 20, icon: Clock },
  CONFIRMED: { next: ['PROCESSING', 'CANCELLED'], color: 'blue', progress: 40, icon: CheckCircle },
  PROCESSING: { next: ['SHIPPED', 'CANCELLED'], color: 'purple', progress: 60, icon: Package },
  SHIPPED: { next: ['DELIVERED'], color: 'orange', progress: 80, icon: Truck },
  DELIVERED: { next: ['REFUNDED'], color: 'green', progress: 100, icon: CheckCircle },
  CANCELLED: { next: [], color: 'red', progress: 0, icon: X },
  REFUNDED: { next: [], color: 'gray', progress: 100, icon: RefreshCw }
}

const CARRIER_TRACKING_URLS: Record<string, string> = {
  'UPS': 'https://www.ups.com/track?track=yes&trackNums=',
  'FEDEX': 'https://www.fedex.com/fedextrack/?trknbr=',
  'USPS': 'https://tools.usps.com/go/TrackConfirmAction?tLabels=',
  'DHL': 'https://www.dhl.com/en/express/tracking.html?AWB=',
  'AMAZON': 'https://track.amazon.com/tracking/',
  'DEFAULT': 'https://www.google.com/search?q=track+package+'
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'DELIVERED': return 'default'
    case 'SHIPPED': return 'secondary'
    case 'PROCESSING': return 'outline'
    case 'CANCELLED': return 'destructive'
    default: return 'secondary'
  }
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({
    status: '',
    paymentStatus: '',
    trackingNumber: '',
    carrier: '',
    noteContent: ''
  })

  const [sendingEmail, setSendingEmail] = useState(false)

  const resolvedParams = use(params)
  const orderId = resolvedParams.id

  useEffect(() => {
    if (session?.user?.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchOrder()
  }, [session, router, orderId])

  const fetchOrder = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data)
        setEditData({
          status: data.status,
          paymentStatus: data.paymentStatus,
          trackingNumber: data.trackingNumber || '',
          carrier: data.carrier || '',
          noteContent: Array.isArray(data.notes) && data.notes.length ? data.notes[0].content : ''
        })
        toast.success('Order loaded successfully')
      } else if (response.status === 404) {
        toast.error('Order not found')
        router.push('/dashboard/orders')
      }
    } catch (error) {
      console.error('Error fetching order:', error)
      toast.error('Failed to load order')
    } finally {
      setLoading(false)
    }
  }

const handleUpdateOrder = async () => {
  if (!order) return
 
  setUpdating(true)
  try {
    // Prepare the update data
    const updatePayload: any = {
      status: editData.status,
      paymentStatus: editData.paymentStatus,
      trackingNumber: editData.trackingNumber || null,
      carrier: editData.carrier || null,
    }

    // ✅ Add note separately if provided
    if (editData.noteContent && editData.noteContent.trim()) {
      updatePayload.notes = [{
        content: editData.noteContent.trim(),
        isInternal: false
      }]
    }

    const response = await fetch(`/api/orders/${order.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    })
   
    if (response.ok) {
      const updatedOrder = await response.json()
      setOrder(updatedOrder)
      setEditMode(false)
      setEditData(prev => ({ ...prev, noteContent: '' })) // ✅ Clear note after save
      toast.success('Order updated successfully')
    } else {
      throw new Error('Failed to update order')
    }
  } catch (error) {
    console.error('Error updating order:', error)
    toast.error('Failed to update order')
  } finally {
    setUpdating(false)
  }
}

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return
   
    setUpdating(true)
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editData, status: newStatus })
      })
     
      if (response.ok) {
        const updatedOrder = await response.json()
        setOrder(updatedOrder)
        setEditData(prev => ({ ...prev, status: newStatus }))
        toast.success(`Order marked as ${newStatus}`)
      } else {
        throw new Error('Failed to update status')
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Failed to update order status')
    } finally {
      setUpdating(false)
    }
  }

  const copyOrderNumber = () => {
    navigator.clipboard.writeText(order?.orderNumber || '')
    toast.success('Order number copied to clipboard')
  }

  const copyTrackingNumber = () => {
    if (order?.trackingNumber) {
      navigator.clipboard.writeText(order.trackingNumber)
      toast.success('Tracking number copied to clipboard')
    }
  }

  const getTrackingUrl = (trackingNumber: string, carrier?: string): string => {
    const carrierKey = carrier?.toUpperCase() || 'DEFAULT'
    const baseUrl = CARRIER_TRACKING_URLS[carrierKey] || CARRIER_TRACKING_URLS['DEFAULT']
    return baseUrl + encodeURIComponent(trackingNumber)
  }

  const getDaysInTransit = (shippedAt: string): number => {
    return Math.floor((new Date().getTime() - new Date(shippedAt).getTime()) / (1000 * 60 * 60 * 24))
  }

  const printInvoice = () => {
    window.open(`/dashboard/orders/${orderId}/invoice`, '_blank')
  }

  const sendOrderConfirmation = async () => {
  try {
    setSendingEmail(true)
    const response = await fetch(`/api/orders/${orderId}/send-confirmation`, {
      method: 'POST'
    })
    
    if (response.ok) {
      toast.success('Order confirmation sent to customer')
    } else {
      const error = await response.json()
      throw new Error(error.message || 'Failed to send confirmation')
    }
  } catch (error) {
    console.error('Error sending confirmation:', error)
    toast.error(error instanceof Error ? error.message : 'Failed to send order confirmation')
  } finally {
    setSendingEmail(false)
  }
}

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="flex items-center mb-6">
          <Skeleton className="h-10 w-10 mr-4" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <Card className="mx-auto max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Order not found</h3>
            <p className="text-muted-foreground mb-4">
              The order you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <Link href="/dashboard/orders">
                Back to Orders
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentStatusInfo = statusFlow[order.status as keyof typeof statusFlow]
  const StatusIcon = currentStatusInfo.icon

  return (
    <TooltipProvider>
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link href="/dashboard/orders">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Order #{order.orderNumber}
                </h1>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={copyOrderNumber}
                      className="h-6 w-6"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy order number</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Created {formatDate(order.createdAt, 'MMMM dd, yyyy')}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  <span>Updated {formatDate(order.updatedAt, 'relative')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!editMode ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={fetchOrder}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh order</p>
                  </TooltipContent>
                </Tooltip>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(true)}
                  className="hidden sm:flex"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Order
                </Button>
                
                <Button size="sm" onClick={printInvoice}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditMode(true)} className="sm:hidden">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Order
                    </DropdownMenuItem>
                    <DropdownMenuItem 
  onClick={sendOrderConfirmation}
  disabled={sendingEmail}
>
  <Send className="h-4 w-4 mr-2" />
  {sendingEmail ? 'Sending...' : 'Send Confirmation'}
</DropdownMenuItem>

                    <DropdownMenuItem onClick={printInvoice}>
                      <FileText className="h-4 w-4 mr-2" />
                      View Invoice
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={copyOrderNumber}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Order Number
                    </DropdownMenuItem>
                    {order.trackingNumber && (
                      <DropdownMenuItem onClick={copyTrackingNumber}>
                        <Package2 className="h-4 w-4 mr-2" />
                        Copy Tracking Number
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditMode(false)
                    setEditData({
                      status: order.status,
                      paymentStatus: order.paymentStatus,
                      trackingNumber: order.trackingNumber || '',
                      carrier: order.carrier || '',
                      noteContent: Array.isArray(order.notes) && order.notes.length ? order.notes[0].content : ''
                    })
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpdateOrder}
                  disabled={updating}
                >
                  {updating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Smart Alerts */}
        {order.status === 'SHIPPED' && order.shippedAt && getDaysInTransit(order.shippedAt) > 7 && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Delayed Shipment</AlertTitle>
            <AlertDescription>
              This order has been in transit for {getDaysInTransit(order.shippedAt)} days. Consider contacting the customer.
            </AlertDescription>
          </Alert>
        )}

        {order.paymentStatus === 'PENDING' && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Payment Pending</AlertTitle>
            <AlertDescription className="text-yellow-700">
              The payment for this order is still pending. Follow up with the customer if needed.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StatusIcon className="h-5 w-5" />
                  Order Status & Progress
                </CardTitle>
                <CardDescription>
                  Track and update the current status of this order
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {editMode ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="status">Order Status</Label>
                      <Select
                        value={editData.status}
                        onValueChange={(value) => setEditData(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
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
                   
                    <div className="space-y-2">
                      <Label htmlFor="paymentStatus">Payment Status</Label>
                      <Select
                        value={editData.paymentStatus}
                        onValueChange={(value) => setEditData(prev => ({ ...prev, paymentStatus: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="PAID">Paid</SelectItem>
                          <SelectItem value="FAILED">Failed</SelectItem>
                          <SelectItem value="REFUNDED">Refunded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(editData.status === 'SHIPPED' || editData.status === 'DELIVERED') && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="carrier">Carrier</Label>
                          <Select
                            value={editData.carrier}
                            onValueChange={(value) => setEditData(prev => ({ ...prev, carrier: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select carrier" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UPS">UPS</SelectItem>
                              <SelectItem value="FEDEX">FedEx</SelectItem>
                              <SelectItem value="USPS">USPS</SelectItem>
                              <SelectItem value="DHL">DHL</SelectItem>
                              <SelectItem value="AMAZON">Amazon Logistics</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="trackingNumber">Tracking Number</Label>
                          <Input
                            id="trackingNumber"
                            value={editData.trackingNumber}
                            onChange={(e) => setEditData(prev => ({ ...prev, trackingNumber: e.target.value }))}
                            placeholder="Enter tracking number"
                          />
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant={getStatusBadgeVariant(order.status)} className="text-sm px-3 py-1">
                          {order.status}
                        </Badge>
                        <Badge 
                          variant={order.paymentStatus === 'PAID' ? 'default' : 
                                  order.paymentStatus === 'FAILED' ? 'destructive' : 'secondary'}
                          className="text-sm px-3 py-1"
                        >
                          <CreditCard className="h-3 w-3 mr-1" />
                          Payment: {order.paymentStatus}
                        </Badge>
                        {order.shippedAt && (
                          <Badge variant="outline" className="text-sm px-3 py-1">
                            <Clock className="h-3 w-3 mr-1" />
                            {getDaysInTransit(order.shippedAt)} days in transit
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Tracking Info */}
                    {order.trackingNumber && (
                      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                              <Package2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                Tracking Number
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <code className="text-sm font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded border">
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
                                  onClick={copyTrackingNumber}
                                >
                                  <Copy className="h-4 w-4" />
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
                            >
                              <a 
                                href={getTrackingUrl(order.trackingNumber, order.carrier)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Track Package
                              </a>
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Order Progress</span>
                        <span className="text-muted-foreground">{currentStatusInfo.progress}%</span>
                      </div>
                      <Progress value={currentStatusInfo.progress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {order.status === 'DELIVERED' 
                          ? 'Order completed successfully'
                          : order.status === 'CANCELLED' || order.status === 'REFUNDED'
                          ? 'Order has been ' + order.status.toLowerCase()
                          : 'Order is currently being processed'
                        }
                      </p>
                    </div>

                    {/* Quick Actions */}
                    {currentStatusInfo.next.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-3">Quick Status Update:</p>
                        <div className="flex flex-wrap gap-2">
                          {currentStatusInfo.next.map((nextStatus) => (
                            <AlertDialog key={nextStatus}>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={updating}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark as {nextStatus}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Update Order Status</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to mark this order as {nextStatus}? 
                                    {nextStatus === 'SHIPPED' && !order.trackingNumber && 
                                      ' You should add a tracking number before shipping.'
                                    }
                                    {nextStatus === 'CANCELLED' && 
                                      ' This action will cancel the order and may trigger a refund.'
                                    }
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleStatusChange(nextStatus)}>
                                    Update Status
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Order Items</CardTitle>
                    <CardDescription>{order.items.length} items in this order</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)} total units
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {order.items.map((item) => (
                    <div key={item.id} className="p-6 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted border">
                          <Image
                            src={item.product.images[0]}
                            alt={item.product.name}
                            width={80}
                            height={80}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/dashboard/products/${item.product.slug}`}
                            className="font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {item.product.name}
                          </Link>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {item.product.category && (
                              <Badge variant="secondary" className="text-xs">
                                {item.product.category.name}
                              </Badge>
                            )}
                            {item.product.sku && (
                              <span className="text-xs text-muted-foreground">
                                SKU: {item.product.sku}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Package className="h-3 w-3" />
                              <span>Qty: {item.quantity}</span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <DollarSign className="h-3 w-3" />
                              <span>{formatPrice(item.price)} each</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-lg text-foreground">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Line total
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
               
                {/* Order Totals */}
                <div className="bg-muted/50 p-6 border-t">
                  <div className="max-w-sm mx-auto space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">{formatPrice(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax:</span>
                      <span className="font-medium">{formatPrice(order.tax)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping:</span>
                      <span className="font-medium">{formatPrice(order.shipping)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-lg">Total:</span>
                      <span className="font-bold text-2xl">{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={order.user.image || ''} alt={order.user.name || 'User'} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {order.user.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">
                      {order.user.name || 'Unknown'}
                    </p>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="h-3 w-3 mr-1 shrink-0" />
                      <span className="truncate">{order.user.email}</span>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Button asChild className="flex-1" size="sm">
                    <Link href={`/dashboard/customers/${order.user.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Profile
                    </Link>
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`mailto:${order.user.email}`}>
                          <Mail className="h-4 w-4" />
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Send email</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            {order.shippingAddress && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-foreground">
                      {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                    </p>
                    {order.shippingAddress.company && (
                      <p className="text-muted-foreground">{order.shippingAddress.company}</p>
                    )}
                    <p className="text-muted-foreground">{order.shippingAddress.address1}</p>
                    {order.shippingAddress.address2 && (
                      <p className="text-muted-foreground">{order.shippingAddress.address2}</p>
                    )}
                    <p className="text-muted-foreground">
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                    </p>
                    <p className="text-muted-foreground">{order.shippingAddress.country}</p>
                  </div>
                  {order.shippingAddress.phone && (
                    <>
                      <Separator />
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="h-3 w-3 mr-2 shrink-0" />
                        <span>{order.shippingAddress.phone}</span>
                      </div>
                    </>
                  )}
                  <Separator />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    asChild
                  >
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${order.shippingAddress.address1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on Map
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Order Summary Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Items</p>
                    <p className="text-2xl font-bold">
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Value</p>
                    <p className="text-2xl font-bold">{formatPrice(order.total)}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={getStatusBadgeVariant(order.status)} className="text-xs">
                      {order.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment:</span>
                    <Badge 
                      variant={order.paymentStatus === 'PAID' ? 'default' : 
                              order.paymentStatus === 'FAILED' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {order.paymentStatus}
                    </Badge>
                  </div>
                  {order.shippedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">In Transit:</span>
                      <span className="font-medium">{getDaysInTransit(order.shippedAt)} days</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notes Section */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <MessageSquare className="h-4 w-4" />
      Order Notes
    </CardTitle>
    <CardDescription>
      Internal notes about this order
    </CardDescription>
  </CardHeader>
  <CardContent>
    {editMode ? (
      <div className="space-y-2">
        <Textarea
          id="noteContent"
          value={editData.noteContent}
          onChange={(e) => setEditData(prev => ({ ...prev, noteContent: e.target.value }))}
          placeholder="Add a new note about this order..."
          rows={5}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          This note will be added when you save changes
        </p>
      </div>
    ) : (
      <div className="space-y-3">
        {/* ✅ FIXED: Properly check if notes is an array */}
        {order?.notes && Array.isArray(order.notes) && order.notes.length > 0 ? (
          <div className="space-y-3">
            {order.notes.map((note) => (
              <div key={note.id} className="border-l-2 border-gray-200 pl-3 py-2">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">
                      {note.author.name || note.author.email || 'Unknown'}
                    </p>
                    {note.isInternal && (
                      <Badge variant="secondary" className="text-xs">Internal</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(note.createdAt, 'PPp')}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <MessageSquare className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notes added</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditMode(true)}
              className="mt-3"
            >
              <Edit className="h-3 w-3 mr-2" />
              Add Note
            </Button>
          </div>
        )}
      </div>
    )}
  </CardContent>
</Card>

            {/* Timeline/History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Order Timeline
                </CardTitle>
                <CardDescription>
                  Key events and status changes for this order
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="w-px h-full bg-border mt-2"></div>
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium text-sm">Order Created</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(order.createdAt, 'PPpp')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Order placed by {order.user.name || order.user.email}
                      </p>
                    </div>
                  </div>

                  {order.status === 'CONFIRMED' || order.status === 'PROCESSING' || order.status === 'SHIPPED' || order.status === 'DELIVERED' ? (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        {(order.status === 'PROCESSING' || order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                          <div className="w-px h-full bg-border mt-2"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium text-sm">Order Confirmed</p>
                        <p className="text-sm text-muted-foreground">Payment verified</p>
                      </div>
                    </div>
                  ) : null}

                  {order.status === 'PROCESSING' || order.status === 'SHIPPED' || order.status === 'DELIVERED' ? (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                          <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
                          <div className="w-px h-full bg-border mt-2"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium text-sm">Processing</p>
                        <p className="text-sm text-muted-foreground">Order is being prepared</p>
                      </div>
                    </div>
                  ) : null}

                  {order.status === 'SHIPPED' || order.status === 'DELIVERED' ? (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                          <Truck className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        {order.status === 'DELIVERED' && (
                          <div className="w-px h-full bg-border mt-2"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium text-sm">Shipped</p>
                        <p className="text-sm text-muted-foreground">
                          {order.shippedAt ? formatDate(order.shippedAt, 'PPpp') : 'In transit'}
                        </p>
                        {order.trackingNumber && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Tracking: {order.trackingNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {order.status === 'DELIVERED' && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium text-sm">Delivered</p>
                        <p className="text-sm text-muted-foreground">
                          {order.deliveredAt ? formatDate(order.deliveredAt, 'PPpp') : 'Order completed'}
                        </p>
                      </div>
                    </div>
                  )}

                  {order.status === 'CANCELLED' && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                          <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium text-sm">Order Cancelled</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(order.updatedAt, 'PPpp')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}