/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================
// FILE: app/(dashboard)/dashboard/coupons/page.tsx - ENHANCED VERSION
// ============================================
'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Gift, Plus, Search, Filter, Edit2, Trash2, Copy, 
  Calendar, Percent, DollarSign, TrendingUp, Eye,
  Clock, CheckCircle, XCircle, AlertTriangle, Download,
  BarChart3, Tag, Zap, MoreVertical, RefreshCw, Loader2,
  X, Grid, List, ArrowUpDown, CalendarPlus, Copy as CopyIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
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
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { formatPrice, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

interface Coupon {
  id: string
  code: string
  description: string | null
  type: 'PERCENTAGE' | 'FIXED_AMOUNT'
  value: number
  minAmount: number | null
  maxUses: number | null
  usedCount: number
  maxUsesPerUser: number | null
  isActive: boolean
  startsAt: string | null
  expiresAt: string | null
  createdAt: string
}

type ViewMode = 'grid' | 'list'
type SortOption = 'code' | 'created' | 'value' | 'usage'
type SortOrder = 'asc' | 'desc'
type BulkAction = 'activate' | 'deactivate' | 'delete' | 'extend'

// ============================================
// Skeleton Loader Component
// ============================================
const CouponCardSkeleton = () => (
  <Card className="animate-pulse">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="h-8 bg-gray-200 rounded w-32" />
          <div className="h-6 bg-gray-200 rounded w-20" />
        </div>
        <div className="h-8 w-8 bg-gray-200 rounded" />
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-16 bg-gray-200 rounded" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-2 bg-gray-200 rounded w-full" />
      </div>
    </CardContent>
  </Card>
)

export default function CouponsPage() {
  const router = useRouter()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statistics, setStatistics] = useState<any>(null)
  const [insights, setInsights] = useState<any>(null)
  
  // Enhanced state
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortOption>('created')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  // Dialog states
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [isBulkExtendOpen, setIsBulkExtendOpen] = useState(false)
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [couponToDelete, setCouponToDelete] = useState<string | null>(null)
  const [couponToDuplicate, setCouponToDuplicate] = useState<Coupon | null>(null)
  
  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [extendDate, setExtendDate] = useState('')
  const [duplicateCode, setDuplicateCode] = useState('')
  const [duplicateDescription, setDuplicateDescription] = useState('')

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        router.push('/dashboard/coupons/new')
      }
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        document.getElementById('search-input')?.focus()
      }
      if (e.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set())
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [selectedIds.size, router])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchCoupons()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [statusFilter, typeFilter, searchTerm])

  const fetchCoupons = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('type', typeFilter)

      const response = await fetch(`/api/admin/coupons?${params}`)
      if (response.ok) {
        const data = await response.json()
        setCoupons(data.coupons)
        setStatistics(data.statistics)
        setInsights(data.insights)
      }
    } catch (error) {
      console.error('Error fetching coupons:', error)
      toast.error('Failed to fetch coupons')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================
  const handleBulkAction = async (action: BulkAction, data?: any) => {
    try {
      setIsSubmitting(true)
      
      const response = await fetch('/api/admin/coupons/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          couponIds: Array.from(selectedIds),
          data
        })
      })

      const result = await response.json()

      if (response.ok) {
        await fetchCoupons()
        setSelectedIds(new Set())
        toast.success(result.message || `Successfully ${action}d coupons`)
        
        // Close dialogs
        setIsBulkDeleteOpen(false)
        setIsBulkExtendOpen(false)
      } else {
        toast.error(result.error || 'Bulk operation failed')
      }
    } catch (error) {
      console.error('Error in bulk operation:', error)
      toast.error('Failed to perform bulk operation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBulkDelete = () => handleBulkAction('delete')
  const handleBulkActivate = () => handleBulkAction('activate')
  const handleBulkDeactivate = () => handleBulkAction('deactivate')
  
  const handleBulkExtend = async () => {
    if (!extendDate) {
      toast.error('Please select an expiration date')
      return
    }
    await handleBulkAction('extend', { expiresAt: new Date(extendDate).toISOString() })
    setExtendDate('')
  }

  // ============================================
  // DUPLICATE COUPON
  // ============================================
  const handleDuplicate = async () => {
    if (!couponToDuplicate || !duplicateCode.trim()) {
      toast.error('Please enter a coupon code')
      return
    }

    try {
      setIsSubmitting(true)
      
      const response = await fetch(`/api/admin/coupons/${couponToDuplicate.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newCode: duplicateCode.trim(),
          adjustments: {
            description: duplicateDescription.trim() || undefined
          }
        })
      })

      const result = await response.json()

      if (response.ok) {
        await fetchCoupons()
        setIsDuplicateOpen(false)
        setCouponToDuplicate(null)
        setDuplicateCode('')
        setDuplicateDescription('')
        toast.success(`Coupon duplicated as ${result.coupon.code}`)
        router.push(`/dashboard/coupons/${result.coupon.id}`)
      } else {
        toast.error(result.error || 'Failed to duplicate coupon')
      }
    } catch (error) {
      console.error('Error duplicating coupon:', error)
      toast.error('Failed to duplicate coupon')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openDuplicateDialog = (coupon: Coupon) => {
    setCouponToDuplicate(coupon)
    setDuplicateCode(`${coupon.code}_COPY`)
    setDuplicateDescription(coupon.description || '')
    setIsDuplicateOpen(true)
  }

  // ============================================
  // SINGLE OPERATIONS
  // ============================================
  const deleteCoupon = async (id: string) => {
    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/admin/coupons/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchCoupons()
        toast.success('Coupon deleted successfully')
      } else {
        toast.error('Failed to delete coupon')
      }
    } catch (error) {
      console.error('Error deleting coupon:', error)
      toast.error('Failed to delete coupon')
    } finally {
      setIsSubmitting(false)
      setDeleteConfirmOpen(false)
      setCouponToDelete(null)
    }
  }

  const toggleCouponStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/coupons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (response.ok) {
        await fetchCoupons()
        toast.success(`Coupon ${!currentStatus ? 'activated' : 'deactivated'}`)
      }
    } catch (error) {
      console.error('Error updating coupon:', error)
      toast.error('Failed to update coupon')
    }
  }

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success(`Code "${code}" copied to clipboard`)
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const getCouponStatus = (coupon: Coupon) => {
    const now = new Date()
    const expiresAt = coupon.expiresAt ? new Date(coupon.expiresAt) : null
    const startsAt = coupon.startsAt ? new Date(coupon.startsAt) : null

    if (!coupon.isActive) return { label: 'Inactive', color: 'bg-slate-100 text-slate-700', icon: XCircle }
    if (startsAt && startsAt > now) return { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', icon: Clock }
    if (expiresAt && expiresAt < now) return { label: 'Expired', color: 'bg-red-100 text-red-700', icon: XCircle }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return { label: 'Maxed Out', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle }
    return { label: 'Active', color: 'bg-green-100 text-green-700', icon: CheckCircle }
  }

  const getUsagePercentage = (coupon: Coupon) => {
    if (!coupon.maxUses) return 0
    return (coupon.usedCount / coupon.maxUses) * 100
  }

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === processedCoupons.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(processedCoupons.map(c => c.id)))
    }
  }

  // Sorted and filtered coupons
  const processedCoupons = useMemo(() => {
    const sorted = [...coupons].sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'code':
          aValue = a.code.toLowerCase()
          bValue = b.code.toLowerCase()
          break
        case 'created':
          aValue = new Date(a.createdAt)
          bValue = new Date(b.createdAt)
          break
        case 'value':
          aValue = a.value
          bValue = b.value
          break
        case 'usage':
          aValue = a.usedCount
          bValue = b.usedCount
          break
        default:
          aValue = new Date(a.createdAt)
          bValue = new Date(b.createdAt)
      }
      
      if (sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    })

    return sorted
  }, [coupons, sortBy, sortOrder])

  const activeFilters = useMemo(() => {
    let count = 0
    if (searchTerm) count++
    if (statusFilter !== 'all') count++
    if (typeFilter !== 'all') count++
    return count
  }, [searchTerm, statusFilter, typeFilter])

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setTypeFilter('all')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <div className="h-20 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <CouponCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Gift className="w-8 h-8" />
              Coupon Management
            </h1>
            <p className="text-slate-600 mt-1">
              Create and manage discount coupons for your store
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <kbd className="px-2 py-1 bg-gray-100 border rounded">Ctrl+N</kbd>
              <span>New coupon</span>
              <kbd className="px-2 py-1 bg-gray-100 border rounded">/</kbd>
              <span>Search</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchCoupons} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button asChild>
              <Link href="/dashboard/coupons/new">
                <Plus className="w-4 h-4 mr-2" />
                Create Coupon
              </Link>
            </Button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedIds.size === processedCoupons.length}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedIds.size} selected
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={handleBulkActivate}
                    variant="outline"
                    size="sm"
                    className="border-green-200 text-green-700 hover:bg-green-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Activate
                  </Button>
                  <Button
                    onClick={handleBulkDeactivate}
                    variant="outline"
                    size="sm"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Deactivate
                  </Button>
                  <Button
                    onClick={() => setIsBulkExtendOpen(true)}
                    variant="outline"
                    size="sm"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    Extend
                  </Button>
                  <Button
                    onClick={() => setIsBulkDeleteOpen(true)}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <Button
                    onClick={() => setSelectedIds(new Set())}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total</p>
                    <p className="text-2xl font-bold text-slate-900">{statistics.total}</p>
                  </div>
                  <Tag className="w-8 h-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Active</p>
                    <p className="text-2xl font-bold text-green-600">{statistics.active}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Expired</p>
                    <p className="text-2xl font-bold text-red-600">{statistics.expired}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Used</p>
                    <p className="text-2xl font-bold text-blue-600">{statistics.totalUsed}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Expiring Soon</p>
                    <p className="text-2xl font-bold text-amber-600">{statistics.expiringSoon}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-amber-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Expiring Soon Alert */}
        {insights?.expiringSoon?.length > 0 && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription>
              <span className="font-medium text-amber-900">
                {insights.expiringSoon.length} coupon(s) expiring within 7 days:
              </span>
              <div className="mt-2 space-y-1">
                {insights.expiringSoon.map((coupon: any) => (
                  <div key={coupon.id} className="text-sm text-amber-700">
                    <strong>{coupon.code}</strong> expires {formatDate(coupon.expiresAt, 'short')}
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Filters & Controls */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="search-input"
                  placeholder="Search coupons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="FIXED_AMOUNT">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort & View Controls */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium whitespace-nowrap">Sort by:</label>
                <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="code">Code</SelectItem>
                    <SelectItem value="created">Created</SelectItem>
                    <SelectItem value="value">Value</SelectItem>
                    <SelectItem value="usage">Usage</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-r-none"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active filters */}
        {activeFilters > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
            <span>Active filters:</span>
            {searchTerm && (
              <Badge variant="secondary" className="gap-1">
                Search: {searchTerm}
                <button onClick={() => setSearchTerm('')}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {statusFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Status: {statusFilter}
                <button onClick={() => setStatusFilter('all')}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {typeFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Type: {typeFilter}
                <button onClick={() => setTypeFilter('all')}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-6">
              Clear all
            </Button>
          </div>
        )}

        {/* Coupons Grid/List */}
        {processedCoupons.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Gift className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No coupons found
              </h3>
              <p className="text-slate-600 mb-6 text-center max-w-md">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters to see more results'
                  : 'Create your first coupon to start offering discounts to your customers'}
              </p>
              <Button asChild>
                <Link href="/dashboard/coupons/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Coupon
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {processedCoupons.map((coupon) => {
              const status = getCouponStatus(coupon)
              const usagePercentage = getUsagePercentage(coupon)
              const StatusIcon = status.icon

              return (
                <Card 
                  key={coupon.id} 
                  className={`relative overflow-hidden hover:shadow-lg transition-all ${
                    selectedIds.has(coupon.id) ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  {/* Selection Checkbox */}
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={selectedIds.has(coupon.id)}
                      onCheckedChange={() => toggleSelection(coupon.id)}
                      className="bg-white shadow-md"
                    />
                  </div>

                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pl-8">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-lg font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded">
                            {coupon.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyCouponCode(coupon.code)}
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/coupons/${coupon.id}`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/coupons/${coupon.id}/edit`)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDuplicateDialog(coupon)}>
                            <CopyIcon className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleCouponStatus(coupon.id, coupon.isActive)}>
                            {coupon.isActive ? (
                              <>
                                <XCircle className="w-4 h-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => {
                              setCouponToDelete(coupon.id)
                              setDeleteConfirmOpen(true)
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Description */}
                    {coupon.description && (
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {coupon.description}
                      </p>
                    )}

                    {/* Value Display */}
                    <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                      {coupon.type === 'PERCENTAGE' ? (
                        <>
                          <Percent className="w-5 h-5 text-blue-600" />
                          <span className="text-2xl font-bold text-blue-900">
                            {coupon.value}%
                          </span>
                        </>
                      ) : (
                        <>
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <span className="text-2xl font-bold text-green-900">
                            ${coupon.value}
                          </span>
                        </>
                      )}
                      <span className="text-sm text-slate-600 ml-auto">
                        {coupon.type === 'PERCENTAGE' ? 'OFF' : 'Discount'}
                      </span>
                    </div>

                    {/* Minimum Amount */}
                    {coupon.minAmount && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Min. Order:</span>
                        <span className="font-medium text-slate-900">
                          {formatPrice(coupon.minAmount)}
                        </span>
                      </div>
                    )}

                    {/* Usage Stats */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-slate-600">Usage:</span>
                        <span className="font-medium text-slate-900">
                          {coupon.usedCount} {coupon.maxUses ? `/ ${coupon.maxUses}` : ''}
                        </span>
                      </div>
                      {coupon.maxUses && (
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              usagePercentage >= 90 ? 'bg-red-500' :
                              usagePercentage >= 70 ? 'bg-amber-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Dates */}
                    <div className="space-y-2 pt-3 border-t border-slate-200">
                      {coupon.startsAt && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Calendar className="w-3 h-3" />
                          <span>Starts: {formatDate(coupon.startsAt, 'short')}</span>
                        </div>
                      )}
                      {coupon.expiresAt && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Clock className="w-3 h-3" />
                          <span>Expires: {formatDate(coupon.expiresAt, 'short')}</span>
                        </div>
                      )}
                      {!coupon.expiresAt && (
                        <div className="flex items-center gap-2 text-xs text-green-600">
                          <Zap className="w-3 h-3" />
                          <span>No expiration</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          /* List View */
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {processedCoupons.map((coupon) => {
                  const status = getCouponStatus(coupon)
                  const usagePercentage = getUsagePercentage(coupon)
                  const StatusIcon = status.icon

                  return (
                    <div 
                      key={coupon.id}
                      className={`p-4 hover:bg-slate-50 transition-colors ${
                        selectedIds.has(coupon.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={selectedIds.has(coupon.id)}
                          onCheckedChange={() => toggleSelection(coupon.id)}
                        />

                        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4">
                          {/* Code & Status */}
                          <div>
                            <code className="text-base font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">
                              {coupon.code}
                            </code>
                            <div className="mt-2">
                              <Badge className={`${status.color} text-xs`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {status.label}
                              </Badge>
                            </div>
                          </div>

                          {/* Value */}
                          <div className="flex items-center gap-2">
                            {coupon.type === 'PERCENTAGE' ? (
                              <>
                                <Percent className="w-4 h-4 text-blue-600" />
                                <span className="font-bold text-slate-900">
                                  {coupon.value}% OFF
                                </span>
                              </>
                            ) : (
                              <>
                                <DollarSign className="w-4 h-4 text-green-600" />
                                <span className="font-bold text-slate-900">
                                  ${coupon.value} Discount
                                </span>
                              </>
                            )}
                          </div>

                          {/* Usage */}
                          <div>
                            <div className="text-sm text-slate-600 mb-1">
                              Usage: <span className="font-medium text-slate-900">
                                {coupon.usedCount} {coupon.maxUses ? `/ ${coupon.maxUses}` : ''}
                              </span>
                            </div>
                            {coupon.maxUses && (
                              <div className="w-full bg-slate-200 rounded-full h-1.5">
                                <div 
                                  className={`h-1.5 rounded-full transition-all ${
                                    usagePercentage >= 90 ? 'bg-red-500' :
                                    usagePercentage >= 70 ? 'bg-amber-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Dates */}
                          <div className="text-xs text-slate-600 space-y-1">
                            {coupon.expiresAt ? (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Expires: {formatDate(coupon.expiresAt, 'short')}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-green-600">
                                <Zap className="w-3 h-3" />
                                No expiration
                              </div>
                            )}
                            {coupon.minAmount && (
                              <div>Min: {formatPrice(coupon.minAmount)}</div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyCouponCode(coupon.code)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/coupons/${coupon.id}`)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/coupons/${coupon.id}/edit`)}>
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDuplicateDialog(coupon)}>
                                <CopyIcon className="w-4 h-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleCouponStatus(coupon.id, coupon.isActive)}>
                                {coupon.isActive ? (
                                  <>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  setCouponToDelete(coupon.id)
                                  setDeleteConfirmOpen(true)
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {coupon.description && (
                        <p className="text-sm text-slate-600 mt-3 ml-10 line-clamp-1">
                          {coupon.description}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Performers */}
        {insights?.topPerformers?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Top Performing Coupons
              </CardTitle>
              <CardDescription>
                Most used coupons in your store
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.topPerformers.slice(0, 5).map((coupon: any, index: number) => (
                  <div 
                    key={coupon.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/coupons/${coupon.id}`)}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono font-medium text-slate-900">{coupon.code}</p>
                      {coupon.description && (
                        <p className="text-xs text-slate-500 truncate">{coupon.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{coupon.usedCount}</p>
                      <p className="text-xs text-slate-500">uses</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/dashboard/coupons/${coupon.id}`)
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-md mx-4 sm:mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Coupon
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this coupon? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => couponToDelete && deleteCoupon(couponToDelete)}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Coupon
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent className="max-w-md mx-4 sm:mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Multiple Coupons
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-3">
                Are you sure you want to delete <strong>{selectedIds.size} coupons</strong>?
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  This action cannot be undone. All selected coupons will be permanently removed.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedIds.size} Coupons
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Extend Dialog */}
      <Dialog open={isBulkExtendOpen} onOpenChange={setIsBulkExtendOpen}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-blue-500" />
              Extend Expiration Date
            </DialogTitle>
            <DialogDescription>
              Set a new expiration date for {selectedIds.size} selected coupon(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="extend-date">New Expiration Date</Label>
              <Input
                id="extend-date"
                type="datetime-local"
                value={extendDate}
                onChange={(e) => setExtendDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-xs text-slate-500">
                All selected coupons will expire at this date and time
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkExtendOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleBulkExtend} disabled={isSubmitting || !extendDate}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Extend {selectedIds.size} Coupons
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Coupon Dialog */}
      <Dialog open={isDuplicateOpen} onOpenChange={setIsDuplicateOpen}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CopyIcon className="h-5 w-5 text-blue-500" />
              Duplicate Coupon
            </DialogTitle>
            <DialogDescription>
              Create a copy of <strong>{couponToDuplicate?.code}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="duplicate-code">New Coupon Code *</Label>
              <Input
                id="duplicate-code"
                value={duplicateCode}
                onChange={(e) => setDuplicateCode(e.target.value.toUpperCase())}
                placeholder="Enter new coupon code"
                maxLength={50}
              />
              <p className="text-xs text-slate-500">
                Must be unique. Only letters, numbers, hyphens, and underscores allowed.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duplicate-description">Description (Optional)</Label>
              <Input
                id="duplicate-description"
                value={duplicateDescription}
                onChange={(e) => setDuplicateDescription(e.target.value)}
                placeholder="Enter description"
              />
            </div>
            {couponToDuplicate && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md space-y-1 text-sm">
                <p className="font-medium text-blue-900">Original coupon details:</p>
                <p className="text-blue-700">Type: {couponToDuplicate.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}</p>
                <p className="text-blue-700">Value: {couponToDuplicate.type === 'PERCENTAGE' ? `${couponToDuplicate.value}%` : `${couponToDuplicate.value}`}</p>
                {couponToDuplicate.minAmount && (
                  <p className="text-blue-700">Min. Amount: {formatPrice(couponToDuplicate.minAmount)}</p>
                )}
                <p className="text-xs text-blue-600 mt-2">All other settings will be copied. You can edit them after creation.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDuplicateOpen(false)
                setCouponToDuplicate(null)
                setDuplicateCode('')
                setDuplicateDescription('')
              }} 
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleDuplicate} disabled={isSubmitting || !duplicateCode.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CopyIcon className="h-4 w-4 mr-2" />
                  Duplicate Coupon
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}