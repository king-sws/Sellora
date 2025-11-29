// app/(dashboard)/dashboard/inventory/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Package, Filter, Download, Calendar, User, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface InventoryLog {
  id: string
  product: {
    id: string
    name: string
    slug: string
    images: string[]
  }
  variant: {
    name: string
  } | null
  changeAmount: number
  newStock: number
  reason: string
  referenceId: string | null
  notes: string | null
  changedByUser: {
    name: string
    email: string
  }
  createdAt: string
}

const REASON_COLORS = {
  SALE: 'bg-green-100 text-green-800',
  RETURN: 'bg-blue-100 text-blue-800',
  ADJUSTMENT_MANUAL: 'bg-purple-100 text-purple-800',
  RECEIVING: 'bg-emerald-100 text-emerald-800',
  CANCELLATION: 'bg-orange-100 text-orange-800',
}

export default function InventoryLogPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    reason: searchParams.get('reason') || 'all',
    search: searchParams.get('search') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
  })

  useEffect(() => {
    fetchInventoryLogs()
  }, [filters])

  const fetchInventoryLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.reason !== 'all') params.append('reason', filters.reason)
      if (filters.search) params.append('search', filters.search)
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.append('dateTo', filters.dateTo)

      const response = await fetch(`/api/admin/inventory/logs?${params}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs)
      }
    } catch (error) {
      console.error('Error fetching inventory logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const headers = ['Date', 'Product', 'Variant', 'Change', 'New Stock', 'Reason', 'Changed By', 'Notes']
    const rows = logs.map(log => [
      formatDate(log.createdAt),
      log.product.name,
      log.variant?.name || 'N/A',
      log.changeAmount,
      log.newStock,
      log.reason,
      log.changedByUser.name,
      log.notes || ''
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-log-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Inventory Log</h1>
          <p className="text-slate-600 mt-1">Track all inventory changes and movements</p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search Product</label>
              <Input
                placeholder="Product name..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Reason</label>
              <Select value={filters.reason} onValueChange={(value) => setFilters({ ...filters, reason: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reasons</SelectItem>
                  <SelectItem value="SALE">Sale</SelectItem>
                  <SelectItem value="RETURN">Return</SelectItem>
                  <SelectItem value="ADJUSTMENT_MANUAL">Manual Adjustment</SelectItem>
                  <SelectItem value="RECEIVING">Receiving</SelectItem>
                  <SelectItem value="CANCELLATION">Cancellation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date From</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date To</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Changes</CardTitle>
          <CardDescription>
            {logs.length} {logs.length === 1 ? 'record' : 'records'} found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No inventory changes found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {logs.map((log) => (
                <div key={log.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Product Image */}
                    {log.product.images?.[0] ? (
                      <Link href={`/dashboard/products/${log.product.slug}`}>
                        <img
                          src={log.product.images[0]}
                          alt={log.product.name}
                          className="w-16 h-16 rounded-lg object-cover hover:opacity-75 transition-opacity"
                        />
                      </Link>
                    ) : (
                      <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Package className="w-8 h-8 text-slate-400" />
                      </div>
                    )}

                    {/* Log Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Link 
                            href={`/dashboard/products/${log.product.slug}`}
                            className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
                          >
                            {log.product.name}
                          </Link>
                          {log.variant && (
                            <p className="text-sm text-slate-600 mt-0.5">
                              Variant: {log.variant.name}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={REASON_COLORS[log.reason as keyof typeof REASON_COLORS]}>
                              {log.reason.replace(/_/g, ' ')}
                            </Badge>
                            
                            <Badge variant={log.changeAmount < 0 ? 'destructive' : 'default'}>
                              {log.changeAmount > 0 ? '+' : ''}{log.changeAmount}
                            </Badge>
                            
                            <span className="text-sm text-slate-600">
                              New Stock: <span className="font-medium">{log.newStock}</span>
                            </span>
                          </div>

                          {log.notes && (
                            <div className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                              <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <span>{log.notes}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-right text-sm">
                          <div className="flex items-center gap-1.5 text-slate-600 justify-end">
                            <User className="w-4 h-4" />
                            <span>{log.changedByUser.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 mt-1 justify-end">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(log.createdAt, '')}</span>
                          </div>
                          {log.referenceId && (
                            <p className="text-xs text-slate-400 mt-1">
                              Ref: {log.referenceId.slice(0, 8)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}