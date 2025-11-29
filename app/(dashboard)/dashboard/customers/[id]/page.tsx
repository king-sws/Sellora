/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(dashboard)/dashboard/customers/[id]/page.tsx
'use client'

import { use, useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  ArrowLeft, Mail, Calendar, MapPin, Phone, Star, Eye,
  DollarSign, ShoppingBag, Package, User, Edit, MoreHorizontal,
  TrendingUp, TrendingDown, CreditCard, Truck, Search, Filter,
  Activity, AlertTriangle, CheckCircle, Clock, Crown, Shield,
  BarChart3, LineChart as LineChartIcon, Zap, Target, Users,
  Plus, Trash2, MapPinPlus, AlertCircle, Download, X
} from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

// Shadcn/ui components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Types
interface CustomerDetail {
  id: string
  name: string | null
  email: string | null
  role: string
  emailVerified: Date | null
  image: string | null
  phone?: string
  createdAt: Date
  updatedAt: Date
  orders: Array<{
    id: string
    orderNumber: string
    total: number
    status: string
    paymentStatus: string
    createdAt: Date
    items: Array<{
      id: string
      quantity: number
      price: number
      product: {
        id: string
        name: string
        slug: string
        images: string[]
        price: number
      }
    }>
  }>
  addresses: Array<{
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
    isDefault: boolean
  }>
  reviews: Array<{
    id: string
    rating: number
    title?: string
    comment?: string
    isVerified: boolean
    createdAt: Date
    product: {
      id: string
      name: string
      slug: string
    }
  }>
  stats: {
    totalSpent: number
    completedOrders: number
    averageOrderValue: number
    lastOrderDate: Date | null
    totalOrders: number
    totalReviews: number
    totalAddresses: number
  }
  _count: {
    orders: number
    reviews: number
    addresses: number
  }
}

interface PaginationState {
  orders: number
  reviews: number
}

interface FilterState {
  orderStatus: string
  paymentStatus: string
  dateRange: string
}

interface EditFormData {
  name: string
  email: string
  phone?: string
}

interface AddressFormData {
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
  isDefault: boolean
}

// Analytics Calculations
const calculateEngagementScore = (customer: CustomerDetail): number => {
  let score = 0
  score += Math.min(40, customer._count.orders * 4)
  score += Math.min(30, (customer.stats.totalSpent / 1000) * 10)
  score += Math.min(20, customer._count.reviews * 10)
  if (customer.emailVerified) score += 10
  return Math.round(score)
}

const calculatePredictedLTV = (customer: CustomerDetail) => {
  const daysSinceJoin = Math.floor((Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  const avgOrderValue = customer.stats.averageOrderValue
  const orderFrequency = customer._count.orders
  
  if (daysSinceJoin === 0 || orderFrequency === 0) return { value: 0, confidence: 0 }
  
  const ordersPerYear = (orderFrequency / daysSinceJoin) * 365
  const projectedLTV = avgOrderValue * ordersPerYear * 3
  const confidence = Math.min(100, orderFrequency * 10)
  
  return { value: projectedLTV, confidence }
}

const getChurnRisk = (customer: CustomerDetail): 'low' | 'medium' | 'high' => {
  if (!customer.stats.lastOrderDate || customer._count.orders === 0) return 'high'
  
  const daysSinceLastOrder = Math.floor((Date.now() - new Date(customer.stats.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysSinceLastOrder > 90) return 'high'
  if (daysSinceLastOrder > 60) return 'medium'
  return 'low'
}

// Components
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendText, 
  subtitle 
}: {
  title: string
  value: string | number
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendText?: string
  subtitle?: string
}) => (
  <Card className="hover:shadow-lg transition-all duration-200">
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-600">{title}</p>
          <p className="text-lg sm:text-2xl font-semibold text-gray-900 truncate mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className="flex-shrink-0 ml-4">
          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Icon className="w-6 h-6 text-cyan-600" />
          </div>
        </div>
      </div>
      {trendText && (
        <div className="mt-3 flex items-center">
          {trend === 'up' && <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1" />}
          {trend === 'down' && <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 mr-1" />}
          <span className={`text-xs sm:text-sm font-medium ${
            trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trendText}
          </span>
        </div>
      )}
    </CardContent>
  </Card>
)

const CustomerInsightCard = ({ customer }: { customer: CustomerDetail }) => {
  const engagementScore = calculateEngagementScore(customer)
  const predictedLTV = calculatePredictedLTV(customer)
  const churnRisk = getChurnRisk(customer)

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
        <div className="flex items-center justify-center mb-1">
          <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
        </div>
        <p className="text-xs text-gray-600 font-medium">Engagement</p>
        <p className="text-base sm:text-lg font-bold text-blue-600 mt-1">{engagementScore}%</p>
      </div>
      
      <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
        <div className="flex items-center justify-center mb-1">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
        </div>
        <p className="text-xs text-gray-600 font-medium">Pred. LTV</p>
        <p className="text-xs sm:text-sm font-bold text-green-600 mt-1">{formatPrice(predictedLTV.value)}</p>
      </div>
      
      <div className="text-center p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
        <div className="flex items-center justify-center mb-1">
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
        </div>
        <p className="text-xs text-gray-600 font-medium">Churn Risk</p>
        <p className={`text-base sm:text-lg font-bold capitalize mt-1 ${
          churnRisk === 'high' ? 'text-red-600' : 
          churnRisk === 'medium' ? 'text-orange-600' : 'text-green-600'
        }`}>
          {churnRisk}
        </p>
      </div>
    </div>
  )
}

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-20 w-full" />
    <Skeleton className="h-40 w-full" />
  </div>
)

const EditCustomerDialog = ({ 
  customer, 
  onSave 
}: { 
  customer: CustomerDetail
  onSave: (data: EditFormData) => void 
}) => {
  const [formData, setFormData] = useState<EditFormData>({
    name: customer.name || '',
    email: customer.email || '',
    phone: customer.phone || '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(formData)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex-1 sm:flex-none" size="sm">
          <Edit className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Edit</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>Update customer information</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter full name"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter email"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter phone number"
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const AddAddressDialog = ({ 
  onSave 
}: { 
  onSave: (data: AddressFormData) => void 
}) => {
  const [formData, setFormData] = useState<AddressFormData>({
    firstName: '',
    lastName: '',
    company: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    phone: '',
    isDefault: false,
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(formData)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <MapPinPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Address</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Address</DialogTitle>
          <DialogDescription>Add a new shipping address for this customer</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="First name"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Last name"
                className="mt-1"
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="Company name (optional)"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="address1">Address 1 *</Label>
            <Input
              id="address1"
              value={formData.address1}
              onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
              placeholder="Street address"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="address2">Address 2</Label>
            <Input
              id="address2"
              value={formData.address2}
              onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
              placeholder="Apartment, suite, etc."
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="state">State/Province *</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
                className="mt-1"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="zipCode">ZIP Code *</Label>
              <Input
                id="zipCode"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                placeholder="ZIP code"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="Country"
                className="mt-1"
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Phone number (optional)"
              className="mt-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="isDefault" className="font-normal">Set as default address</Label>
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Address'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Main Component
export default function CustomerDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const resolvedParams = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({ orders: 1, reviews: 1 })
  const [filters, setFilters] = useState<FilterState>({
    orderStatus: 'all',
    paymentStatus: 'all',
    dateRange: 'all',
  })
  const [tabLoading, setTabLoading] = useState(false)

  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    if (session?.user?.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchCustomer()
  }, [session, router, resolvedParams.id])

  const fetchCustomer = async () => {
    try {
      const response = await fetch(`/api/customers/${resolvedParams.id}`)
      if (response.ok) {
        const data = await response.json()
        setCustomer(data)
      } else if (response.status === 404) {
        router.push('/dashboard/customers')
      }
    } catch (error) {
      console.error('Error fetching customer:', error)
      toast.error('Failed to load customer data')
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setTabLoading(true)
    setTimeout(() => setTabLoading(false), 300)
  }

  const handleCustomerEdit = async (data: EditFormData) => {
    try {
      const response = await fetch(`/api/customers/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (response.ok) {
        const updated = await response.json()
        setCustomer(updated)
        toast.success('Customer updated successfully')
      }
    } catch (error) {
      toast.error('Failed to update customer')
    }
  }

  const handleAddAddress = async (data: AddressFormData) => {
    try {
      const response = await fetch(`/api/customers/${resolvedParams.id}/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (response.ok) {
        const updated = await response.json()
        setCustomer(updated)
        toast.success('Address added successfully')
      }
    } catch (error) {
      toast.error('Failed to add address')
    }
  }

  const handleDeleteAddress = async (addressId: string) => {
    if (window.confirm('Delete this address?')) {
      try {
        const response = await fetch(`/api/customers/${resolvedParams.id}/addresses/${addressId}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          const updated = await response.json()
          setCustomer(updated)
          toast.success('Address deleted')
        }
      } catch (error) {
        toast.error('Failed to delete address')
      }
    }
  }

  const getCustomerInitials = (name: string | null) => {
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getOrderStatusVariant = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'default'
      case 'PROCESSING': return 'secondary'
      case 'SHIPPED': return 'outline'
      case 'CANCELLED': return 'destructive'
      default: return 'secondary'
    }
  }

  const getPaymentStatusVariant = (status: string) => {
    return status === 'PAID' ? 'default' : 'secondary'
  }

  const generateOrderTimeline = useCallback(() => {
    if (!customer || customer.orders.length === 0) return []
    
    const timeline = customer.orders
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .reduce((acc: any[], order) => {
        const monthYear = new Date(order.createdAt).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        })
        const existing = acc.find(item => item.month === monthYear)
        if (existing) {
          existing.orders += 1
          existing.revenue += order.total
        } else {
          acc.push({
            month: monthYear,
            orders: 1,
            revenue: order.total,
            date: order.createdAt
          })
        }
        return acc
      }, [])
    
    return timeline.reverse().slice(-12)
  }, [customer])

  const filteredOrders = useMemo(() => {
    if (!customer) return []
    
    return customer.orders.filter(order => {
      const matchesSearch = 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesOrderStatus = filters.orderStatus === 'all' || order.status === filters.orderStatus
      const matchesPaymentStatus = filters.paymentStatus === 'all' || order.paymentStatus === filters.paymentStatus
      
      return matchesSearch && matchesOrderStatus && matchesPaymentStatus
    })
  }, [customer, searchTerm, filters])

  const filteredReviews = useMemo(() => {
    if (!customer) return []
    
    return customer.reviews.filter(review =>
      (review.title?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (review.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      review.product.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [customer, searchTerm])

  const filteredAddresses = useMemo(() => {
    if (!customer) return []
    
    return customer.addresses.filter(addr =>
      `${addr.firstName} ${addr.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      addr.address1.toLowerCase().includes(searchTerm.toLowerCase()) ||
      addr.city.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [customer, searchTerm])

  const paginatedOrders = useMemo(() => {
    const start = (pagination.orders - 1) * ITEMS_PER_PAGE
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredOrders, pagination.orders])

  const paginatedReviews = useMemo(() => {
    const start = (pagination.reviews - 1) * ITEMS_PER_PAGE
    return filteredReviews.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredReviews, pagination.reviews])

  const orderTimeline = useMemo(() => generateOrderTimeline(), [generateOrderTimeline])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading customer details...</p>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Customer not found</p>
            <Button asChild>
              <Link href="/dashboard/customers">Back to Customers</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/dashboard/customers">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Avatar className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 border-2 ">
              {customer.image && !customer.image.startsWith('data:') && customer.image.length > 0 ? (
                <AvatarImage src={customer.image} alt={customer.name || 'Customer'} />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-600 text-white font-bold text-lg">
                {getCustomerInitials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">
                {customer.name || 'Unknown Customer'}
              </h1>
              <div className="flex items-center gap-1 text-muted-foreground mt-1 truncate">
                <Mail className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate text-xs sm:text-sm">{customer.email}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <EditCustomerDialog customer={customer} onSave={handleCustomerEdit} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap items-center gap-2">
        {customer.role === 'ADMIN' && (
          <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1 border border-purple-300">
            <Shield className="w-3 h-3" />
            Admin
          </Badge>
        )}
        {customer.emailVerified ? (
          <Badge className="bg-green-100 text-green-800 flex items-center gap-1 border border-green-300">
            <CheckCircle className="w-3 h-3" />
            Verified
          </Badge>
        ) : (
          <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1 border border-yellow-300">
            <Clock className="w-3 h-3" />
            Unverified
          </Badge>
        )}
        {customer._count.orders > 10 && (
          <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1 border border-purple-300">
            <Crown className="w-3 h-3" />
            VIP
          </Badge>
        )}
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Spent"
          value={formatPrice(customer.stats.totalSpent)}
          icon={DollarSign}
          subtitle={`Avg: ${formatPrice(customer.stats.averageOrderValue)}`}
        />
        <StatCard
          title="Total Orders"
          value={customer.stats.totalOrders}
          icon={ShoppingBag}
          subtitle={`${customer.stats.completedOrders} completed`}
        />
        <StatCard
          title="Member Since"
          value={formatDate(customer.createdAt).split(',')[0]}
          icon={Calendar}
          subtitle={customer.emailVerified ? 'Verified' : 'Unverified'}
        />
        <StatCard
          title="Last Order"
          value={customer.stats.lastOrderDate ? formatDate(customer.stats.lastOrderDate) : 'Never'}
          icon={Package}
          subtitle={`${customer._count.reviews} reviews`}
        />
      </div>

      {/* Insights Card */}
      <CustomerInsightCard customer={customer} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-4 sm:flex bg-gray-100 p-1 rounded-lg">
            <TabsTrigger value="overview" className="text-xs sm:text-sm data-[state=active]:bg-white">
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs sm:text-sm data-[state=active]:bg-white">
              Orders
              <Badge variant="secondary" className="ml-2 text-xs hidden sm:inline-flex">{customer.stats.totalOrders}</Badge>
            </TabsTrigger>
            <TabsTrigger value="addresses" className="text-xs sm:text-sm data-[state=active]:bg-white">
              Address
              <Badge variant="secondary" className="ml-2 text-xs hidden sm:inline-flex">{customer._count.addresses}</Badge>
            </TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs sm:text-sm data-[state=active]:bg-white">
              Reviews
              <Badge variant="secondary" className="ml-2 text-xs hidden sm:inline-flex">{customer._count.reviews}</Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 sm:space-y-6 animate-in fade-in-50 duration-300">
          {tabLoading ? <LoadingSkeleton /> : (
            <>
              {/* Customer Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Customer Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Full Name</Label>
                        <p className="text-sm text-foreground mt-1 font-medium">{customer.name || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Email</Label>
                        <p className="text-sm text-foreground mt-1 break-all font-medium">{customer.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Role</Label>
                        <Badge variant="outline" className="mt-2">{customer.role}</Badge>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Member Since</Label>
                        <p className="text-sm text-foreground mt-1 font-medium">{formatDate(customer.createdAt, 'long')}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Email Verified</Label>
                        <p className="text-sm text-foreground mt-1 font-medium">
                          {customer.emailVerified ? formatDate(customer.emailVerified, 'long') : 'Not verified'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Last Updated</Label>
                        <p className="text-sm text-foreground mt-1 font-medium">{formatDate(customer.updatedAt, 'long')}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Timeline */}
              {orderTimeline.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LineChartIcon className="w-5 h-5 text-green-600" />
                      Order Timeline
                    </CardTitle>
                    <CardDescription>Monthly order volume and revenue (Last 12 months)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 sm:h-80 -mx-2 sm:mx-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={orderTimeline}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="month" fontSize={12} />
                          <YAxis yAxisId="left" fontSize={12} />
                          <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}`} fontSize={12} />
                          <Tooltip 
                            formatter={(value: number, name) => {
                              if (name === 'revenue') return [formatPrice(value), 'Revenue']
                              return [value, 'Orders']
                            }}
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
                          />
                          <Legend />
                          <Bar yAxisId="left" dataKey="orders" fill="#3b82f6" name="Orders" radius={[8, 8, 0, 0]} />
                          <Bar yAxisId="right" dataKey="revenue" fill="#10b981" name="Revenue" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Orders */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-orange-600" />
                    Recent Orders
                  </CardTitle>
                  <CardDescription>Last 5 orders</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {customer.orders.slice(0, 5).length > 0 ? (
                    customer.orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">#{order.orderNumber}</p>
                          <p className="text-xs text-gray-600">{formatDate(order.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getOrderStatusVariant(order.status)} className="text-xs">
                            {order.status}
                          </Badge>
                          <Badge variant={getPaymentStatusVariant(order.paymentStatus)} className="text-xs">
                            {order.paymentStatus}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3">
                          <div className="text-right">
                            <p className="font-medium text-sm">{formatPrice(order.total)}</p>
                            <p className="text-xs text-gray-600">{order.items.length} items</p>
                          </div>
                          <Link href={`/dashboard/orders/${order.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-600 text-sm">No orders yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4 animate-in fade-in-50 duration-300">
          {tabLoading ? <LoadingSkeleton /> : (
            <>
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Search by order number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-white"
                      />
                    </div>
                    <Select value={filters.orderStatus} onValueChange={(val) => setFilters({...filters, orderStatus: val})}>
                      <SelectTrigger className="w-full sm:w-40 bg-white">
                        <SelectValue placeholder="Order Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="PROCESSING">Processing</SelectItem>
                        <SelectItem value="SHIPPED">Shipped</SelectItem>
                        <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                        <SelectItem value="DELIVERED">Delivered</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                {paginatedOrders.length > 0 ? (
                  paginatedOrders.map((order) => (
                    <Card key={order.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                          <div>
                            <p className="font-medium text-sm sm:text-base">#{order.orderNumber}</p>
                            <p className="text-xs sm:text-sm text-gray-600">{formatDate(order.createdAt, 'long')}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={getOrderStatusVariant(order.status)}>
                              {order.status}
                            </Badge>
                            <Badge variant={getPaymentStatusVariant(order.paymentStatus)}>
                              {order.paymentStatus}
                            </Badge>
                          </div>
                        </div>
                        
                        <Separator className="my-4" />
                        
                        <div className="space-y-3">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                              <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden">
                                {item.product.images[0] ? (
                                  <img 
                                    src={item.product.images[0]} 
                                    alt={item.product.name} 
                                    className="w-full h-full object-cover" 
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gray-300">
                                    <Package className="w-6 h-6 text-gray-600" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.product.name}</p>
                                <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                              </div>
                              <p className="font-medium text-sm shrink-0 text-right">
                                {formatPrice(item.price * item.quantity)}
                              </p>
                            </div>
                          ))}
                        </div>

                        <Separator className="my-4" />
                        
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Total</p>
                          <p className="text-lg font-bold text-blue-600">{formatPrice(order.total)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600">No orders found</p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination({...pagination, orders: Math.max(1, pagination.orders - 1)})}
                    disabled={pagination.orders === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.orders} of {Math.ceil(filteredOrders.length / ITEMS_PER_PAGE)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination({...pagination, orders: pagination.orders + 1})}
                    disabled={pagination.orders * ITEMS_PER_PAGE >= filteredOrders.length}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Addresses Tab */}
        <TabsContent value="addresses" className="space-y-4 animate-in fade-in-50 duration-300">
          {tabLoading ? <LoadingSkeleton /> : (
            <>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search addresses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <AddAddressDialog onSave={handleAddAddress} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {filteredAddresses.length > 0 ? (
                  filteredAddresses.map((address) => (
                    <Card key={address.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-base">
                              {address.firstName} {address.lastName}
                            </CardTitle>
                            {address.company && (
                              <p className="text-xs text-gray-600 mt-1">{address.company}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {address.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAddress(address.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex gap-2">
                            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div className="text-gray-700">
                              <p>{address.address1}</p>
                              {address.address2 && <p>{address.address2}</p>}
                              <p>{address.city}, {address.state} {address.zipCode}</p>
                              <p>{address.country}</p>
                            </div>
                          </div>
                          {address.phone && (
                            <div className="flex gap-2 items-start">
                              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                              <p className="text-gray-700">{address.phone}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600 mb-4">No addresses found</p>
                    <AddAddressDialog onSave={handleAddAddress} />
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4 animate-in fade-in-50 duration-300">
          {tabLoading ? <LoadingSkeleton /> : (
            <>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search reviews..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="space-y-4">
                {paginatedReviews.length > 0 ? (
                  paginatedReviews.map((review) => (
                    <Card key={review.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < review.rating 
                                        ? 'text-yellow-400 fill-current' 
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              {review.isVerified && (
                                <Badge variant="secondary" className="text-xs">Verified</Badge>
                              )}
                            </div>
                            {review.title && (
                              <h4 className="font-semibold text-sm mb-2">{review.title}</h4>
                            )}
                            {review.comment && (
                              <p className="text-sm text-gray-700 leading-relaxed break-words line-clamp-4 mb-2">
                                {review.comment}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 shrink-0 sm:text-right">
                            {formatDate(review.createdAt)}
                          </p>
                        </div>
                        
                        <Separator className="my-3" />
                        
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 justify-between">
                          <p className="text-xs text-gray-600">Product: <span className="font-medium text-gray-900">{review.product.name}</span></p>
                          <Link href={`/dashboard/products/${review.product.slug}`}>
                            <Button variant="outline" size="sm" className="w-full sm:w-auto">
                              <Eye className="w-4 h-4 mr-2" />
                              View Product
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Star className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600">No reviews yet</p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {Math.ceil(filteredReviews.length / ITEMS_PER_PAGE) > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination({...pagination, reviews: Math.max(1, pagination.reviews - 1)})}
                    disabled={pagination.reviews === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {pagination.reviews} of {Math.ceil(filteredReviews.length / ITEMS_PER_PAGE)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination({...pagination, reviews: pagination.reviews + 1})}
                    disabled={pagination.reviews * ITEMS_PER_PAGE >= filteredReviews.length}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}