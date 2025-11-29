// app/(dashboard)/dashboard/refunds/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { RotateCcw, Filter, Search, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Refund {
  id: string
  order: {
    id: string
    orderNumber: string
    total: number
    user: {
      name: string
      email: string
    }
  }
  amount: number
  reason: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSED'
  refundId: string | null
  processedAt: string | null
  requestedByUser: {
    name: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  APPROVED: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
  PROCESSED: 'bg-blue-100 text-blue-800 border-blue-200',
}

const STATUS_ICONS = {
  PENDING: Clock,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
  PROCESSED: CheckCircle,
}

export default function RefundsPage() {
  const searchParams = useSearchParams()
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || 'all',
    search: searchParams.get('search') || '',
  })

  useEffect(() => {
    fetchRefunds()
  }, [filters])

  const fetchRefunds = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.status !== 'all') params.append('status', filters.status)
      if (filters.search) params.append('search', filters.search)

      const response = await fetch(`/api/admin/refunds?${params}`)
      if (response.ok) {
        const data = await response.json()
        setRefunds(data.refunds)
      }
    } catch (error) {
      console.error('Error fetching refunds:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefundAction = async (refundId: string, action: 'approve' | 'reject' | 'process') => {
    try {
      setActionLoading(true)
      const response = await fetch(`/api/admin/refunds/${refundId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: action === 'reject' ? rejectionReason : undefined 
        })
      })

      if (response.ok) {
        fetchRefunds()
        setSelectedRefund(null)
        setRejectionReason('')
      }
    } catch (error) {
      console.error(`Error ${action}ing refund:`, error)
    } finally {
      setActionLoading(false)
    }
  }

  const getTotalRefundStats = () => {
    const stats = {
      pending: { count: 0, amount: 0 },
      approved: { count: 0, amount: 0 },
      processed: { count: 0, amount: 0 },
      rejected: { count: 0, amount: 0 },
      total: { count: refunds.length, amount: 0 }
    }

    refunds.forEach(refund => {
      stats.total.amount += refund.amount
      const status = refund.status.toLowerCase() as keyof typeof stats
      if (stats[status]) {
        stats[status].count++
        stats[status].amount += refund.amount
      }
    })

    return stats
  }

  const stats = getTotalRefundStats()

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Refunds Management</h1>
          <p className="text-slate-600 mt-1">Process and track customer refunds</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Refunds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total.count}</div>
            <p className="text-sm text-slate-600">{formatPrice(stats.total.amount)}</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-800">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900">{stats.pending.count}</div>
            <p className="text-sm text-yellow-700">{formatPrice(stats.pending.amount)}</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-800">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{stats.approved.count}</div>
            <p className="text-sm text-green-700">{formatPrice(stats.approved.amount)}</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-800">Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{stats.processed.count}</div>
            <p className="text-sm text-blue-700">{formatPrice(stats.processed.amount)}</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-800">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">{stats.rejected.count}</div>
            <p className="text-sm text-red-700">{formatPrice(stats.rejected.amount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Order number, customer email..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="PROCESSED">Processed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Refunds List */}
      <Card>
        <CardHeader>
          <CardTitle>Refund Requests</CardTitle>
          <CardDescription>
            {refunds.length} {refunds.length === 1 ? 'request' : 'requests'} found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
            </div>
          ) : refunds.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <RotateCcw className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No refund requests found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {refunds.map((refund) => {
                const StatusIcon = STATUS_ICONS[refund.status]
                return (
                  <div key={refund.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Link
                            href={`/dashboard/orders/${refund.order.id}`}
                            className="font-medium text-slate-900 hover:text-blue-600"
                          >
                            Order #{refund.order.orderNumber}
                          </Link>
                          <Badge className={STATUS_COLORS[refund.status]}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {refund.status}
                          </Badge>
                        </div>

                        <div className="space-y-1 text-sm text-slate-600">
                          <p>
                            Customer: <span className="font-medium">{refund.order.user.name || refund.order.user.email}</span>
                          </p>
                          <p>
                            Requested by: <span className="font-medium">{refund.requestedByUser.name || refund.requestedByUser.email}</span>
                          </p>
                          <p>
                            Order Total: <span className="font-medium">{formatPrice(refund.order.total)}</span>
                          </p>
                          {refund.reason && (
                            <p className="text-slate-700 mt-2">
                              Reason: {refund.reason}
                            </p>
                          )}
                          {refund.processedAt && (
                            <p className="text-green-600 mt-2">
                              Processed: {formatDate(refund.processedAt, "")}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900 mb-2">
                          {formatPrice(refund.amount)}
                        </div>
                        <p className="text-xs text-slate-500 mb-3">
                          Requested {formatDate(refund.createdAt, 'short')}
                        </p>

                        {refund.status === 'PENDING' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleRefundAction(refund.id, 'approve')}
                              disabled={actionLoading}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setSelectedRefund(refund)}
                              disabled={actionLoading}
                            >
                              Reject
                            </Button>
                          </div>
                        )}

                        {refund.status === 'APPROVED' && (
                          <Button
                            size="sm"
                            onClick={() => handleRefundAction(refund.id, 'process')}
                            disabled={actionLoading}
                          >
                            Mark Processed
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={!!selectedRefund} onOpenChange={() => setSelectedRefund(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Refund Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this refund request.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRefund(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedRefund && handleRefundAction(selectedRefund.id, 'reject')}
              disabled={!rejectionReason.trim() || actionLoading}
            >
              Reject Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}