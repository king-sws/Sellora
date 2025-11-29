/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(dashboard)/dashboard/customers/page.tsx
'use client'
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  Users, Search, Filter, Eye, MoreHorizontal,
  UserCheck, UserX, Calendar, DollarSign,
  Mail, Phone, MapPin, Crown, TrendingUp, TrendingDown,
  ChevronDown, RefreshCw, Download, Plus, Settings,
  AlertTriangle, CheckCircle, XCircle, Clock,
  ArrowUpDown, ArrowUp, ArrowDown, Trash2, UserPlus,
  UserMinus, Shield, ShieldOff, Check, X, Menu, Tag,
  FileText, Send, BarChart3, Zap, Target, Activity
} from 'lucide-react'

// Shadcn UI components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

// Types
interface Customer {
  id: string
  name: string | null
  email: string | null
  role: string
  emailVerified: Date | null
  image: string | null
  createdAt: Date
  updatedAt: Date
  totalSpent: number
  lastOrderDate: Date | null
  completedOrders: number
  pendingOrders: number
  averageOrderValue: number
  _count: {
    orders: number
    reviews: number
    addresses: number
    cart: number
  }
  recentOrders: Array<{
    id: string
    total: number
    status: string
    createdAt: Date
  }>
}

interface CustomerStats {
  overview: {
    totalCustomers: number
    totalAdmins: number
    newCustomersThisMonth: number
    newCustomersLastMonth: number
    customerGrowthRate: number
    verifiedCustomers: number
    verificationRate: number
  }
  engagement: {
    customersWithOrders: number
    activationRate: number
    activeCustomers30Days: number
    activeCustomers90Days: number
    customersWithReviews: number
    engagementRate: number
    customersWithMultipleAddresses: number
    retentionRate30Days: number
  }
  topPerformers: {
    bySpending: Array<{
      id: string
      name: string | null
      email: string | null
      totalSpent: number
      totalOrders: number
    }>
    recentCustomers: Array<{
      id: string
      name: string | null
      email: string | null
      createdAt: Date
      emailVerified: Date | null
      _count: { orders: number }
    }>
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
  hasNext: boolean
  hasPrev: boolean
}

interface BulkActionResult {
  message: string
  results: Array<{
    success: boolean
    customerId?: string
    customer?: any
    error?: string
  }>
  summary: {
    total: number
    successful: number
    failed: number
  }
}

// Custom hooks
const useCustomerFilters = () => {
  const searchParams = useSearchParams()
  
  const [filters, setFilters] = useState({
    searchTerm: searchParams.get('search') || '',
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    roleFilter: searchParams.get('role') || 'ALL',
    verifiedFilter: searchParams.get('verified') || 'all',
    hasOrdersFilter: searchParams.get('hasOrders') || 'all',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    minSpent: searchParams.get('minSpent') || '',
    maxSpent: searchParams.get('maxSpent') || '',
  })

  const updateFilter = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({
      searchTerm: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      roleFilter: 'ALL',
      verifiedFilter: 'all',
      hasOrdersFilter: 'all',
      dateFrom: '',
      dateTo: '',
      minSpent: '',
      maxSpent: '',
    })
  }, [])

  return { filters, updateFilter, clearFilters }
}

const useCustomerActions = () => {
  const [actionLoading, setActionLoading] = useState<string>('')
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  const performAction = useCallback(async (
    customerIds: string[], 
    action: string, 
    reason?: string
  ) => {
    try {
      const isArray = Array.isArray(customerIds)
      if (!isArray) setActionLoading(customerIds as string)
      else setBulkActionLoading(true)

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          customerIds: isArray ? customerIds : [customerIds],
          reason: reason || undefined
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.summary.successful > 0) {
          toast.success('Action completed successfully')
          return result
        } else {
          toast.error('Action failed')
          return null
        }
      } else {
        toast.error('Action failed')
        return null
      }
    } catch (error) {
      console.error('Error performing action:', error)
      toast.error('Failed to perform action')
      return null
    } finally {
      setActionLoading('')
      setBulkActionLoading(false)
    }
  }, [])

  return { actionLoading, bulkActionLoading, performAction }
}

// Keyboard shortcuts hook
const useKeyboardShortcuts = (handlers: { [key: string]: () => void }) => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const key = `${e.ctrlKey || e.metaKey ? 'ctrl+' : ''}${e.shiftKey ? 'shift+' : ''}${e.key.toLowerCase()}`
      
      if (handlers[key]) {
        e.preventDefault()
        handlers[key]()
      }
      
      if (e.key === 'Escape' && handlers['escape']) {
        handlers['escape']()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handlers])
}

// Search history hook
const useSearchHistory = () => {
  const [history, setHistory] = useState<string[]>([])

  const addToHistory = useCallback((term: string) => {
    if (term.trim()) {
      setHistory(prev => [
        term,
        ...prev.filter(s => s !== term)
      ].slice(0, 5))
    }
  }, [])

  return { history, addToHistory }
}

// Utility functions
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price)
}

const formatDate = (date: Date | string, format: 'short' | 'long' = 'short') => {
  const d = new Date(date)
  if (format === 'long') {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const calculateEngagementScore = (customer: Customer): number => {
  let score = 0
  
  // Orders contribute 40 points
  score += Math.min(40, customer._count.orders * 4)
  
  // Total spent contributes 30 points
  score += Math.min(30, (customer.totalSpent / 1000) * 10)
  
  // Reviews contribute 20 points
  score += Math.min(20, customer._count.reviews * 10)
  
  // Email verified contributes 10 points
  if (customer.emailVerified) score += 10
  
  return Math.round(score)
}

const calculatePredictedLTV = (customer: Customer) => {
  const daysSinceJoin = Math.floor((Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24))
  const avgOrderValue = customer.averageOrderValue
  const orderFrequency = customer._count.orders
  
  if (daysSinceJoin === 0 || orderFrequency === 0) return { value: 0, confidence: 0 }
  
  const ordersPerYear = (orderFrequency / daysSinceJoin) * 365
  const projectedLTV = avgOrderValue * ordersPerYear * 3 // 3 year projection
  const confidence = Math.min(100, orderFrequency * 10)
  
  return { value: projectedLTV, confidence }
}

const getChurnRisk = (customer: Customer): 'low' | 'medium' | 'high' => {
  if (!customer.lastOrderDate || customer._count.orders === 0) return 'high'
  
  const daysSinceLastOrder = Math.floor((Date.now() - new Date(customer.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysSinceLastOrder > 90) return 'high'
  if (daysSinceLastOrder > 60) return 'medium'
  return 'low'
}

// Components
const TableSkeleton = () => (
  <>
    {Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
        <TableCell>
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </TableCell>
        <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
        <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
        <TableCell>
          <div className="flex justify-end space-x-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </TableCell>
      </TableRow>
    ))}
  </>
)

const CustomerAvatar = ({ customer }: { customer: Customer }) => {
  const [imgError, setImgError] = useState(false)
  
  return (
    <div className="flex-shrink-0">
      {customer.image && !imgError ? (
        <img 
          src={customer.image}
          alt={customer.name || 'Customer'}
          className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
          <span className="text-xs sm:text-sm font-medium text-white">
            {customer.name ? customer.name.charAt(0).toUpperCase() : customer.email?.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  )
}

const StatsCard = ({ title, value, icon: Icon, trend, trendText, className = "" }: {
  title: string
  value: string | number
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendText?: string
  className?: string
}) => (
  <Card className={`${className} hover:shadow-lg transition-all duration-200 cursor-pointer group`}>
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        <div className="flex-shrink-0 ml-4">
          <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <Icon className="w-6 h-6 text-blue-600" />
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

const CustomerSegmentBadge = ({ customer }: { customer: Customer }) => {
  const segment = useMemo(() => {
    if (customer.totalSpent === 0) return { label: 'Prospect', color: 'bg-gray-100 text-gray-800', icon: Target }
    if (customer.totalSpent > 5000 && customer._count.orders > 10) return { label: 'VIP', color: 'bg-purple-100 text-purple-800', icon: Crown }
    if (customer.totalSpent > 1000 && customer._count.orders > 5) return { label: 'Loyal', color: 'bg-blue-100 text-blue-800', icon: Shield }
    if (customer._count.orders === 1) return { label: 'One-time', color: 'bg-orange-100 text-orange-800', icon: Zap }
    return { label: 'Regular', color: 'bg-green-100 text-green-800', icon: UserCheck }
  }, [customer])

  const Icon = segment.icon

  return (
    <Badge variant="secondary" className={`${segment.color} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {segment.label}
    </Badge>
  )
}

const CustomerStatusBadge = ({ customer }: { customer: Customer }) => {
  if (customer.role === 'ADMIN') {
    return (
      <Badge variant="secondary" className="bg-purple-100 text-purple-800 flex items-center gap-1">
        <Shield className="w-3 h-3" />
        Admin
      </Badge>
    )
  }
  if (customer.emailVerified) {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        Verified
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
      <Clock className="w-3 h-3" />
      Unverified
    </Badge>
  )
}

const CustomerInsightCard = ({ customer }: { customer: Customer }) => {
  const engagementScore = calculateEngagementScore(customer)
  const predictedLTV = calculatePredictedLTV(customer)
  const churnRisk = getChurnRisk(customer)

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-2">
      <div className="text-center p-2 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-center mb-1">
          <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
        </div>
        <p className="text-xs text-gray-600">Engagement</p>
        <p className="text-sm sm:text-lg font-bold text-blue-600">{engagementScore}%</p>
      </div>
      
      <div className="text-center p-2 bg-green-50 rounded-lg">
        <div className="flex items-center justify-center mb-1">
          <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
        </div>
        <p className="text-xs text-gray-600">Pred. LTV</p>
        <p className="text-xs sm:text-sm font-bold text-green-600">{formatPrice(predictedLTV.value)}</p>
      </div>
      
      <div className="text-center p-2 bg-orange-50 rounded-lg">
        <div className="flex items-center justify-center mb-1">
          <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" />
        </div>
        <p className="text-xs text-gray-600">Churn Risk</p>
        <p className={`text-sm sm:text-lg font-bold capitalize ${
          churnRisk === 'high' ? 'text-red-600' : 
          churnRisk === 'medium' ? 'text-orange-600' : 'text-green-600'
        }`}>
          {churnRisk}
        </p>
      </div>
    </div>
  )
}

const MobileFilters = ({ filters, updateFilter, clearFilters, onApply }: {
  filters: any
  updateFilter: (key: string, value: string) => void
  clearFilters: () => void
  onApply: () => void
}) => (
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="outline" size="sm" className="sm:hidden">
        <Filter className="w-4 h-4 mr-2" />
        Filters
      </Button>
    </SheetTrigger>
    <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
      <SheetHeader>
        <SheetTitle>Filter Customers</SheetTitle>
        <SheetDescription>
          Apply filters to find specific customers
        </SheetDescription>
      </SheetHeader>
      <div className="mt-6 space-y-4">
        <div>
          <Label htmlFor="mobile-search">Search</Label>
          <div className="relative mt-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              id="mobile-search"
              placeholder="Name, email, or ID..."
              value={filters.searchTerm}
              onChange={(e) => updateFilter('searchTerm', e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div>
          <Label>Role</Label>
          <Select value={filters.roleFilter} onValueChange={(value) => updateFilter('roleFilter', value)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="USER">Users</SelectItem>
              <SelectItem value="ADMIN">Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Email Status</Label>
          <Select value={filters.verifiedFilter} onValueChange={(value) => updateFilter('verifiedFilter', value)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Verified</SelectItem>
              <SelectItem value="false">Unverified</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Order Status</Label>
          <Select value={filters.hasOrdersFilter} onValueChange={(value) => updateFilter('hasOrdersFilter', value)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Has Orders</SelectItem>
              <SelectItem value="false">No Orders</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Date From</Label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Date To</Label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Min Spent ($)</Label>
            <Input
              type="number"
              placeholder="0"
              value={filters.minSpent}
              onChange={(e) => updateFilter('minSpent', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Max Spent ($)</Label>
            <Input
              type="number"
              placeholder="10000"
              value={filters.maxSpent}
              onChange={(e) => updateFilter('maxSpent', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex space-x-2 pt-4">
          <Button onClick={clearFilters} variant="outline" className="flex-1">
            Clear
          </Button>
          <Button onClick={onApply} className="flex-1">
            Apply
          </Button>
        </div>
      </div>
    </SheetContent>
  </Sheet>
)

const ExportDialog = ({ selectedCount, totalCount, filteredCount }: {
  selectedCount: number
  totalCount: number
  filteredCount: number
}) => {
  const [exportFormat, setExportFormat] = useState('csv')
  const [exportScope, setExportScope] = useState('all')
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'name', 'email', 'totalSpent', 'orders', 'joinDate', 'lastOrder'
  ])

  const fields = [
    { id: 'name', label: 'Name' },
    { id: 'email', label: 'Email' },
    { id: 'totalSpent', label: 'Total Spent' },
    { id: 'orders', label: 'Orders' },
    { id: 'joinDate', label: 'Join Date' },
    { id: 'lastOrder', label: 'Last Order' },
    { id: 'status', label: 'Status' },
    { id: 'segment', label: 'Segment' },
  ]

  const toggleField = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(f => f !== fieldId)
        : [...prev, fieldId]
    )
  }

  const handleExport = () => {
    toast.success('Export started! Download will begin shortly.')
    // Implement actual export logic here
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Customers</DialogTitle>
          <DialogDescription>Choose export format and fields</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Format</Label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="pdf">PDF Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Export Scope</Label>
            <Select value={exportScope} onValueChange={setExportScope}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers ({totalCount})</SelectItem>
                <SelectItem value="filtered">Filtered Results ({filteredCount})</SelectItem>
                {selectedCount > 0 && (
                  <SelectItem value="selected">Selected Only ({selectedCount})</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="mb-2 block">Fields to Include</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              {fields.map(field => (
                <div key={field.id} className="flex items-center">
                  <Checkbox 
                    id={field.id}
                    checked={selectedFields.includes(field.id)}
                    onCheckedChange={() => toggleField(field.id)}
                  />
                  <Label htmlFor={field.id} className="ml-2 text-sm font-normal cursor-pointer">
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button onClick={handleExport} disabled={selectedFields.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const QuickActionsBar = ({ 
  selectedCount, 
  onClear,
  onEmail,
  onExport,
  onTag,
  onDelete 
}: {
  selectedCount: number
  onClear: () => void
  onEmail: () => void
  onExport: () => void
  onTag: () => void
  onDelete: () => void
}) => {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-200">
      <Card className="shadow-2xl border-2">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-bold text-blue-600">{selectedCount}</span>
              </div>
              <span className="text-sm font-medium hidden sm:inline">selected</span>
            </div>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button size="sm" variant="ghost" onClick={onEmail}>
              <Mail className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Email</span>
            </Button>
            
            <Button size="sm" variant="ghost" onClick={onExport}>
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            
            <Button size="sm" variant="ghost" onClick={onTag}>
              <Tag className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Tag</span>
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
            
            <Button size="sm" variant="ghost" onClick={onClear}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const KeyboardShortcutsHint = () => (
  <div className="hidden lg:flex items-center gap-4 text-xs text-gray-500">
    <div className="flex items-center gap-1">
      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">⌘K</kbd>
      <span>Search</span>
    </div>
    <div className="flex items-center gap-1">
      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">⌘A</kbd>
      <span>Select All</span>
    </div>
    <div className="flex items-center gap-1">
      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">ESC</kbd>
      <span>Clear</span>
    </div>
  </div>
)

const EmptyState = ({ type, onClearFilters }: { 
  type: 'no-results' | 'no-customers'
  onClearFilters?: () => void 
}) => {
  const content = {
    'no-results': {
      icon: Search,
      title: 'No customers found',
      description: 'Try adjusting your search or filter criteria to find what you\'re looking for',
      action: onClearFilters ? (
        <Button onClick={onClearFilters} variant="outline">
          <X className="w-4 h-4 mr-2" />
          Clear All Filters
        </Button>
      ) : null
    },
    'no-customers': {
      icon: Users,
      title: 'No customers yet',
      description: 'Start building your customer base and grow your business',
      action: (
        <Button asChild>
          <Link href="/dashboard/customers/invite">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Customers
          </Link>
        </Button>
      )
    }
  }[type]
  
  const Icon = content.icon
  
  return (
    <div className="text-center py-16 px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-50 to-purple-50 mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{content.title}</h3>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">{content.description}</p>
      {content.action}
    </div>
  )
}

const CustomerTableRow = ({ 
  customer, 
  isSelected, 
  onSelect, 
  isLoading, 
  onAction,
  currentUserId 
}: {
  customer: Customer
  isSelected: boolean
  onSelect: () => void
  isLoading: boolean
  onAction: (action: string, customerId: string) => void
  currentUserId?: string
}) => (
  <TableRow className="hover:bg-gray-50 transition-colors">
    <TableCell className="w-4 p-2 sm:p-4">
      <Checkbox
        checked={isSelected}
        onCheckedChange={onSelect}
        disabled={isLoading}
      />
    </TableCell>
    <TableCell className="p-2 sm:p-4">
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        <div className="relative">
          <CustomerAvatar customer={customer} />
          <span className={`absolute bottom-0 right-0 block w-3 h-3 rounded-full border-2 border-white ${
            customer.emailVerified ? 'bg-green-400' : 'bg-yellow-400'
          }`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-900 truncate">
            {customer.name || 'Unknown'}
          </div>
          <div className="text-xs sm:text-sm text-gray-500 flex items-center truncate">
            <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
        </div>
      </div>
    </TableCell>
    <TableCell className="text-xs sm:text-sm text-gray-500 p-2 sm:p-4 hidden sm:table-cell">
      {formatDate(customer.createdAt, 'long')}
    </TableCell>
    <TableCell className="p-2 sm:p-4">
      <div className="text-xs sm:text-sm">
        <div className="text-gray-900 font-medium">{customer._count.orders}</div>
        <div className="text-gray-500 hidden sm:block">{customer.completedOrders} done</div>
      </div>
    </TableCell>
    <TableCell className="p-2 sm:p-4">
      <div className="text-xs sm:text-sm">
        <div className="font-medium text-gray-900">{formatPrice(customer.totalSpent)}</div>
        <div className="text-gray-500 hidden sm:block">
          Avg: {formatPrice(customer.averageOrderValue)}
        </div>
      </div>
    </TableCell>
    <TableCell className="text-xs sm:text-sm text-gray-500 p-2 sm:p-4 hidden lg:table-cell">
      {customer.lastOrderDate ? formatDate(customer.lastOrderDate) : 'Never'}
    </TableCell>
    <TableCell className="p-2 sm:p-4 hidden md:table-cell">
      <CustomerSegmentBadge customer={customer} />
    </TableCell>
    <TableCell className="p-2 sm:p-4">
      <CustomerStatusBadge customer={customer} />
    </TableCell>
    <TableCell className="p-2 sm:p-4">
      <div className="flex items-center justify-end space-x-1 sm:space-x-2">
        <Link href={`/dashboard/customers/${customer.id}`}>
          <Button variant="ghost" size="sm" disabled={isLoading}>
            <Eye className="w-4 h-4" />
          </Button>
        </Link>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" disabled={isLoading}>
              {isLoading ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              ) : (
                <MoreHorizontal className="w-4 h-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {customer.role === 'USER' ? (
              <DropdownMenuItem onClick={() => onAction('promote_to_admin', customer.id)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Promote to Admin
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => onAction('demote_to_user', customer.id)}
                disabled={customer.id === currentUserId}
              >
                <UserMinus className="w-4 h-4 mr-2" />
                Demote to User
              </DropdownMenuItem>
            )}
            
            {customer.emailVerified ? (
              <DropdownMenuItem onClick={() => onAction('unverify_email', customer.id)}>
                <XCircle className="w-4 h-4 mr-2" />
                Unverify Email
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onAction('verify_email', customer.id)}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Verify Email
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={() => onAction('delete', customer.id)}
              className="text-red-600"
              disabled={customer.id === currentUserId}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TableCell>
  </TableRow>
)

export default function CustomersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { filters, updateFilter, clearFilters } = useCustomerFilters()
  const { actionLoading, bulkActionLoading, performAction } = useCustomerActions()
  const { history: searchHistory, addToHistory } = useSearchHistory()
  
  // State
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stats, setStats] = useState<CustomerStats | null>(null)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
    hasNext: false,
    hasPrev: false
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [bulkActionResult, setBulkActionResult] = useState<BulkActionResult | null>(null)
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [bulkAction, setBulkAction] = useState('')
  const [bulkReason, setBulkReason] = useState('')
  const [showSearchHistory, setShowSearchHistory] = useState(false)

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'ctrl+k': () => document.getElementById('search')?.focus(),
    'ctrl+a': () => handleSelectAll(),
    'escape': () => setSelectedCustomers([])
  })

  // Effects
  useEffect(() => {
    if (session?.user?.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchCustomers()
    fetchStats()
  }, [session, router, pagination.page])

  // Functions
  const fetchCustomers = useCallback(async () => {
    try {
      setRefreshing(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        role: filters.roleFilter,
        verified: filters.verifiedFilter,
        hasOrders: filters.hasOrdersFilter
      })
      
      if (filters.searchTerm.trim()) params.append('search', filters.searchTerm.trim())
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)
      if (filters.minSpent) params.append('minSpent', filters.minSpent)
      if (filters.maxSpent) params.append('maxSpent', filters.maxSpent)
      
      const response = await fetch(`/api/customers?${params}`)
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('Failed to fetch customers')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [pagination.page, pagination.limit, filters])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/customers/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching customer stats:', error)
    }
  }

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    addToHistory(filters.searchTerm)
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchCustomers()
    setShowSearchHistory(false)
  }

  const handleSort = (field: string) => {
    if (filters.sortBy === field) {
      updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      updateFilter('sortBy', field)
      updateFilter('sortOrder', 'desc')
    }
  }

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    )
  }

  const handleSelectAll = () => {
    setSelectedCustomers(
      selectedCustomers.length === customers.length 
        ? [] 
        : customers.map(c => c.id)
    )
  }

  const handleSingleAction = async (action: string, customerId: string) => {
    const result = await performAction([customerId], action)
    if (result) {
      await fetchCustomers()
      await fetchStats()
    }
  }

  const handleBulkAction = async () => {
    if (!bulkAction || selectedCustomers.length === 0) return
    
    const result = await performAction(selectedCustomers, bulkAction, bulkReason)
    if (result) {
      setBulkActionResult(result)
      setSelectedCustomers([])
      await fetchCustomers()
      await fetchStats()
    }
    setShowBulkDialog(false)
    setBulkAction('')
    setBulkReason('')
  }

  const getSortIcon = (field: string) => {
    if (filters.sortBy !== field) return <ArrowUpDown className="w-4 h-4 ml-1" />
    return filters.sortOrder === 'asc' ? 
      <ArrowUp className="w-4 h-4 ml-1" /> : 
      <ArrowDown className="w-4 h-4 ml-1" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading customers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-8 h-8 text-blue-600" />
            Customer Management
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Manage and view detailed customer information and analytics
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            onClick={() => {
              fetchCustomers()
              fetchStats()
            }}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <ExportDialog 
            selectedCount={selectedCustomers.length}
            totalCount={pagination.total}
            filteredCount={customers.length}
          />
        </div>
      </div>

      {/* Stats Cards - Enhanced with animations */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard
            title="Total Customers"
            value={stats.overview.totalCustomers}
            icon={Users}
            trend={stats.overview.customerGrowthRate >= 0 ? 'up' : 'down'}
            trendText={`${stats.overview.customerGrowthRate >= 0 ? '+' : ''}${stats.overview.customerGrowthRate}% this month`}
          />
          <StatsCard
            title="Active Customers"
            value={stats.engagement.customersWithOrders}
            icon={UserCheck}
            trend="up"
            trendText={`${stats.engagement.activationRate}% activation rate`}
          />
          <StatsCard
            title="Top Customer"
            value={stats.topPerformers.bySpending[0] ? formatPrice(stats.topPerformers.bySpending[0].totalSpent) : '$0'}
            icon={Crown}
            trendText={stats.topPerformers.bySpending[0]?.name || 'No customers yet'}
          />
          <StatsCard
            title="Retention Rate"
            value={`${stats.engagement.retentionRate30Days}%`}
            icon={TrendingUp}
            trend={stats.engagement.retentionRate30Days >= 70 ? 'up' : stats.engagement.retentionRate30Days >= 50 ? 'neutral' : 'down'}
            trendText="30-day retention"
          />
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      <KeyboardShortcutsHint />

      {/* Bulk Action Result Alert */}
      {bulkActionResult && (
        <Alert className={bulkActionResult.summary.failed > 0 ? "border-yellow-200 bg-yellow-50" : "border-green-200 bg-green-50"}>
          {bulkActionResult.summary.failed > 0 ? (
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription className="flex items-center justify-between">
            <span>{bulkActionResult.message}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setBulkActionResult(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-lg">
            <Filter className="w-5 h-5 mr-2" />
            Search & Filters
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Mobile Search */}
          <div className="sm:hidden space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search customers..."
                value={filters.searchTerm}
                onChange={(e) => updateFilter("searchTerm", e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <MobileFilters
                filters={filters}
                updateFilter={updateFilter}
                clearFilters={clearFilters}
                onApply={handleSearch}
              />
              <Button onClick={handleSearch} size="sm" disabled={refreshing}>
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>
          </div>

          {/* Desktop Filters */}
          <form onSubmit={handleSearch} className="hidden sm:block space-y-6">
            {/* First row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Label htmlFor="search" className="mb-1 block">
                  Search Customers
                </Label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Name, email, or ID..."
                    value={filters.searchTerm}
                    onChange={(e) => updateFilter("searchTerm", e.target.value)}
                    onFocus={() => setShowSearchHistory(true)}
                    onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
                    className="pl-9"
                  />
                  {/* Search History Dropdown */}
                  {showSearchHistory && searchHistory.length > 0 && (
                    <div className="absolute top-full mt-1 w-full bg-white border rounded-md shadow-lg z-50">
                      <div className="p-2">
                        <p className="text-xs text-gray-500 mb-2 px-2">Recent Searches</p>
                        {searchHistory.map((term, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              updateFilter('searchTerm', term)
                              setShowSearchHistory(false)
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded flex items-center"
                          >
                            <Clock className="w-3 h-3 mr-2 text-gray-400" />
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="role" className="mb-1 block">
                  Role
                </Label>
                <Select
                  value={filters.roleFilter}
                  onValueChange={(value) => updateFilter("roleFilter", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Roles</SelectItem>
                    <SelectItem value="USER">Users</SelectItem>
                    <SelectItem value="ADMIN">Admins</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="verified" className="mb-1 block">
                  Email Status
                </Label>
                <Select
                  value={filters.verifiedFilter}
                  onValueChange={(value) => updateFilter("verifiedFilter", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Email status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Verified</SelectItem>
                    <SelectItem value="false">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="hasOrders" className="mb-1 block">
                  Order Status
                </Label>
                <Select
                  value={filters.hasOrdersFilter}
                  onValueChange={(value) => updateFilter("hasOrdersFilter", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Order status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Has Orders</SelectItem>
                    <SelectItem value="false">No Orders</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Second row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="dateFrom" className="mb-1 block">
                  Registration From
                </Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter("dateFrom", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="dateTo" className="mb-1 block">
                  Registration To
                </Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter("dateTo", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="minSpent" className="mb-1 block">
                  Min Spent ($)
                </Label>
                <Input
                  id="minSpent"
                  type="number"
                  placeholder="0"
                  value={filters.minSpent}
                  onChange={(e) => updateFilter("minSpent", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="maxSpent" className="mb-1 block">
                  Max Spent ($)
                </Label>
                <Input
                  id="maxSpent"
                  type="number"
                  placeholder="10000"
                  value={filters.maxSpent}
                  onChange={(e) => updateFilter("maxSpent", e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Button type="submit" disabled={refreshing}>
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
              <Button type="button" variant="outline" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Bulk Actions Dialog */}
      {selectedCustomers.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                {selectedCustomers.length} customer{selectedCustomers.length > 1 ? 's' : ''} selected
              </span>
              <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-white">
                    <Settings className="w-4 h-4 mr-2" />
                    Bulk Actions
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Bulk Action</DialogTitle>
                    <DialogDescription>
                      Perform an action on {selectedCustomers.length} selected customer{selectedCustomers.length > 1 ? 's' : ''}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="bulkAction">Action</Label>
                      <Select value={bulkAction} onValueChange={setBulkAction}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select an action" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="promote_to_admin">
                            <div className="flex items-center">
                              <UserPlus className="w-4 h-4 mr-2" />
                              Promote to Admin
                            </div>
                          </SelectItem>
                          <SelectItem value="demote_to_user">
                            <div className="flex items-center">
                              <UserMinus className="w-4 h-4 mr-2" />
                              Demote to User
                            </div>
                          </SelectItem>
                          <SelectItem value="verify_email">
                            <div className="flex items-center">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Verify Email
                            </div>
                          </SelectItem>
                          <SelectItem value="unverify_email">
                            <div className="flex items-center">
                              <XCircle className="w-4 h-4 mr-2" />
                              Unverify Email
                            </div>
                          </SelectItem>
                          <SelectItem value="delete">
                            <div className="flex items-center text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Customer
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="reason">Reason (Optional)</Label>
                      <Textarea
                        id="reason"
                        placeholder="Enter reason for this action..."
                        value={bulkReason}
                        onChange={(e) => setBulkReason(e.target.value)}
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleBulkAction}
                      disabled={!bulkAction || bulkActionLoading}
                    >
                      {bulkActionLoading ? (
                        <>
                          <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Execute
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Bar */}
      <QuickActionsBar
        selectedCount={selectedCustomers.length}
        onClear={() => setSelectedCustomers([])}
        onEmail={() => toast.info('Email feature coming soon')}
        onExport={() => toast.info('Export selected customers')}
        onTag={() => toast.info('Tag feature coming soon')}
        onDelete={() => setShowBulkDialog(true)}
      />

      {/* Customer Table */}
      <Card>
        <CardHeader className="pb-2 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center text-lg font-semibold">
              <Users className="w-5 h-5 mr-2 text-blue-600" />
              All Customers ({pagination.total.toLocaleString()})
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={selectedCustomers.length === customers.length && customers.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="text-sm cursor-pointer">
                  Select All
                </Label>
              </div>
              {selectedCustomers.length > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {selectedCustomers.length} selected
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Mobile Card View */}
          <div className="block sm:hidden">
            {refreshing ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                          <div className="flex gap-2 mt-2">
                            <Skeleton className="h-5 w-16 rounded-full" />
                            <Skeleton className="h-5 w-16 rounded-full" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : customers.length > 0 ? (
              customers.map((customer) => (
                <div
                  key={customer.id}
                  className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <Checkbox
                        checked={selectedCustomers.includes(customer.id)}
                        onCheckedChange={() => handleSelectCustomer(customer.id)}
                        disabled={actionLoading === customer.id}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <CustomerAvatar customer={customer} />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {customer.name || 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {customer.email}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Orders:</span>
                            <span className="font-medium">{customer._count.orders}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Total Spent:</span>
                            <span className="font-medium">{formatPrice(customer.totalSpent)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Joined:</span>
                            <span className="font-medium">{formatDate(customer.createdAt)}</span>
                          </div>
                        </div>
                        
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex gap-2">
                            <CustomerSegmentBadge customer={customer} />
                            <CustomerStatusBadge customer={customer} />
                          </div>
                        </div>
                        
                        <CustomerInsightCard customer={customer} />
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading === customer.id}
                          className="ml-2"
                        >
                          {actionLoading === customer.id ? (
                            <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                          ) : (
                            <MoreHorizontal className="w-4 h-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/customers/${customer.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {customer.role === 'USER' ? (
                          <DropdownMenuItem onClick={() => handleSingleAction('promote_to_admin', customer.id)}>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Promote to Admin
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleSingleAction('demote_to_user', customer.id)}
                            disabled={customer.id === session?.user?.id}
                          >
                            <UserMinus className="w-4 h-4 mr-2" />
                            Demote to User
                          </DropdownMenuItem>
                        )}
                        {customer.emailVerified ? (
                          <DropdownMenuItem onClick={() => handleSingleAction('unverify_email', customer.id)}>
                            <XCircle className="w-4 h-4 mr-2" />
                            Unverify Email
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleSingleAction('verify_email', customer.id)}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Verify Email
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleSingleAction('delete', customer.id)}
                          className="text-red-600"
                          disabled={customer.id === session?.user?.id}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState type="no-results" onClearFilters={clearFilters} />
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow className="text-sm">
                  <TableHead className="w-12"></TableHead>
                  <TableHead onClick={() => handleSort('name')} className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center">
                      Customer {getSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('createdAt')} className="cursor-pointer hover:bg-gray-50 transition-colors hidden sm:table-cell">
                    <div className="flex items-center">
                      Joined {getSortIcon('createdAt')}
                    </div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('totalOrders')} className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center">
                      Orders {getSortIcon('totalOrders')}
                    </div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('totalSpent')} className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center">
                      Total Spent {getSortIcon('totalSpent')}
                    </div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('lastOrderDate')} className="cursor-pointer hover:bg-gray-50 transition-colors hidden lg:table-cell">
                    <div className="flex items-center">
                      Last Order {getSortIcon('lastOrderDate')}
                    </div>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">Segment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refreshing ? (
                  <TableSkeleton />
                ) : customers.length > 0 ? (
                  customers.map((customer) => (
                    <CustomerTableRow
                      key={customer.id}
                      customer={customer}
                      isSelected={selectedCustomers.includes(customer.id)}
                      onSelect={() => handleSelectCustomer(customer.id)}
                      isLoading={actionLoading === customer.id}
                      onAction={handleSingleAction}
                      currentUserId={session?.user?.id}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <EmptyState type="no-results" onClearFilters={clearFilters} />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="border-t border-gray-200 px-3 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-sm text-gray-700 text-center sm:text-left">
                  Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{" "}
                  <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{" "}
                  <span className="font-medium">{pagination.total.toLocaleString()}</span> results
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={!pagination.hasPrev || refreshing}
                  >
                    <ArrowUp className="w-4 h-4 mr-1 rotate-[-90deg]" />
                    Previous
                  </Button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      let pageNum
                      if (pagination.pages <= 5) {
                        pageNum = i + 1
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1
                      } else if (pagination.page >= pagination.pages - 2) {
                        pageNum = pagination.pages - 4 + i
                      } else {
                        pageNum = pagination.page - 2 + i
                      }
                      
                      if (pageNum > pagination.pages || pageNum < 1) return null
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === pagination.page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPagination((prev) => ({ ...prev, page: pageNum }))}
                          disabled={refreshing}
                          className="w-9"
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                    disabled={!pagination.hasNext || refreshing}
                  >
                    Next
                    <ArrowUp className="w-4 h-4 ml-1 rotate-90" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Performers Section */}
      {stats && stats.topPerformers.bySpending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Crown className="w-5 h-5 mr-2 text-yellow-600" />
              Top Performing Customers
            </CardTitle>
            <CardDescription>
              Your most valuable customers by total spending
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topPerformers.bySpending.slice(0, 5).map((customer, index) => (
                <div key={customer.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {customer.name || 'Unknown'}
                        </p>
                        {index === 0 && <Crown className="w-4 h-4 text-yellow-600" />}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      {formatPrice(customer.totalSpent)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {customer.totalOrders} orders
                    </p>
                  </div>
                  <Link href={`/dashboard/customers/${customer.id}`}>
                    <Button variant="ghost" size="sm" className="ml-2">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Customers Section */}
      {stats && stats.topPerformers.recentCustomers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <UserPlus className="w-5 h-5 mr-2 text-green-600" />
              Recent Customers
            </CardTitle>
            <CardDescription>
              Newest customers who joined your platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topPerformers.recentCustomers.slice(0, 5).map((customer) => (
                <div key={customer.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-400 to-blue-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {customer.name?.charAt(0).toUpperCase() || customer.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {customer.name || 'Unknown'}
                        </p>
                        {customer.emailVerified && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                    </div>
                  </div>
                  <div className="text-right mr-2">
                    <p className="text-xs text-gray-500">
                      Joined {formatDate(customer.createdAt)}
                    </p>
                    <p className="text-xs text-gray-600 font-medium">
                      {customer._count.orders} orders
                    </p>
                  </div>
                  <Link href={`/dashboard/customers/${customer.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}