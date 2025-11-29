/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Mail,
  Users,
  Download,
  RefreshCw,
  Search,
  TrendingUp,
  UserCheck,
  UserX,
  Filter,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Activity,
  BarChart3,
  Plus
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts'
import { toast } from 'sonner'
import Link from 'next/link'

interface NewsletterStats {
  total: number
  active: number
  inactive: number
}

interface NewsletterSubscription {
  id: string
  email: string
  isActive: boolean
  source: string | null
  createdAt: string
  confirmedAt: string | null
  unsubscribedAt: string | null
  unsubscribeReason: string | null
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function NewsletterAnalyticsPage() {
  const [subscriptions, setSubscriptions] = useState<NewsletterSubscription[]>([])
  const [stats, setStats] = useState<NewsletterStats | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchNewsletterData()
  }, [currentPage, statusFilter])

  const fetchNewsletterData = async () => {
    try {
      setLoading(true)
      setError(null)

      const isActiveParam = statusFilter === 'all' ? '' : `&isActive=${statusFilter === 'active'}`
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''
      
      const response = await fetch(
        `/api/admin/newsletter?page=${currentPage}&limit=50${isActiveParam}${searchParam}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch newsletter data')
      }

      const data = await response.json()
      setSubscriptions(data.subscriptions)
      setStats(data.stats)
      setPagination(data.pagination)
      
    } catch (err) {
      console.error('Error fetching newsletter data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load newsletter data')
      toast.error('Failed to load newsletter data')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setCurrentPage(1)
    fetchNewsletterData()
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const isActiveParam = statusFilter === 'all' ? '' : `?isActive=${statusFilter === 'active'}`
      
      const response = await fetch(`/api/admin/newsletter/export${isActiveParam}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success('Newsletter data exported successfully')
    } catch (err) {
      console.error('Export error:', err)
      toast.error('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const handleBackToCompany = () => {
    window.location.href = '/company'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const activeRate = stats 
    ? ((stats.active / (stats.total || 1)) * 100).toFixed(1)
    : '0'

  const churnRate = stats
    ? ((stats.inactive / (stats.total || 1)) * 100).toFixed(1)
    : '0'

  const barChartData = stats ? [
    {
      name: 'Active',
      value: stats.active,
      fill: '#18181b'
    },
    {
      name: 'Unsubscribed',
      value: stats.inactive,
      fill: '#71717a'
    }
  ] : []

  const trendData = stats ? [
    { period: 'Current', Active: stats.active, Inactive: stats.inactive }
  ] : []

  if (loading && !subscriptions.length) {
    return (
      <div className="min-h-screen bg-neutral-50 p-4 md:p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-neutral-200">
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 p-4 md:p-6">
        <Alert variant="destructive" className="border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button onClick={fetchNewsletterData} variant="outline" size="sm" className="ml-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4">
        
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-simebold text-neutral-900 flex items-center gap-3">
                
                Newsletter Analytics
              </h1>
              <p className="text-neutral-600 mt-2 text-sm sm:text-base">
                Monitor subscriber engagement and track growth metrics
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                  asChild
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm"
                >
                  <Link href="/dashboard/newsletter/campaign">
                    <Plus className="h-4 w-4 mr-1" />
                    Create Campaign
                  </Link>
                </Button>

              <Button 
                onClick={fetchNewsletterData} 
                variant="outline" 
                size="sm"
                className="border-neutral-300 hover:bg-neutral-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                onClick={handleExport} 
                size="sm" 
                disabled={exporting}
                className="bg-neutral-900 hover:bg-neutral-800 text-white"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-neutral-200 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600">Total Subscribers</CardTitle>
                <div className="p-2 bg-neutral-100 rounded-lg">
                  <Users className="h-4 w-4 text-neutral-700" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-neutral-900">{stats.total.toLocaleString()}</div>
                <p className="text-xs text-neutral-500 mt-1">All time registrations</p>
              </CardContent>
            </Card>

            <Card className="border-neutral-200 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600">Active Subscribers</CardTitle>
                <div className="p-2 bg-green-50 rounded-lg">
                  <UserCheck className="h-4 w-4 text-green-700" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-700">{stats.active.toLocaleString()}</div>
                <p className="text-xs text-neutral-500 mt-1">{activeRate}% of total subscribers</p>
              </CardContent>
            </Card>

            <Card className="border-neutral-200 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600">Unsubscribed</CardTitle>
                <div className="p-2 bg-red-50 rounded-lg">
                  <UserX className="h-4 w-4 text-red-700" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-700">{stats.inactive.toLocaleString()}</div>
                <p className="text-xs text-neutral-500 mt-1">{churnRate}% churn rate</p>
              </CardContent>
            </Card>

            <Card className="border-neutral-200 hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600">Retention Rate</CardTitle>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-blue-700" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-700">{activeRate}%</div>
                <p className="text-xs text-neutral-500 mt-1">Active engagement ratio</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <Card className="border-neutral-200">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    placeholder="Search by email address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-9 border-neutral-300 focus:border-neutral-900"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={(value: any) => {
                setStatusFilter(value)
                setCurrentPage(1)
              }}>
                <SelectTrigger className="w-full sm:w-[180px] border-neutral-300">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subscribers</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleSearch}
                className="bg-neutral-900 hover:bg-neutral-800 text-white"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <Card className="border-neutral-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-netural-950 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Subscriber Status Overview
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis 
  dataKey="name" 
  stroke="#9CA3AF" // Tailwind gray-400
  style={{ fontSize: '12px' }}
/>
<YAxis 
  stroke="#9CA3AF"
  style={{ fontSize: '12px' }}
/>

                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e5e5',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[8, 8, 0, 0]}
                        maxBarSize={100}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-neutral-900"></div>
                    <span className="text-sm text-neutral-600">Active: {stats.active.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-neutral-500"></div>
                    <span className="text-sm text-neutral-600">Inactive: {stats.inactive.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metrics Summary */}
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle className="text-neutral-900 flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Engagement Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-neutral-700">Active Rate</span>
                      <span className="text-sm font-bold text-neutral-900">{activeRate}%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-3">
                      <div 
                        className="bg-neutral-900 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${activeRate}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-neutral-700">Churn Rate</span>
                      <span className="text-sm font-bold text-neutral-900">{churnRate}%</span>
                    </div>
                    <div className="w-full bg-neutral-200 rounded-full h-3">
                      <div 
                        className="bg-neutral-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${churnRate}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-neutral-200 grid grid-cols-2 gap-4">
                    <div className="bg-neutral-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-neutral-900">{stats.active}</div>
                      <div className="text-xs text-neutral-600 mt-1">Active Users</div>
                    </div>
                    <div className="bg-neutral-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-neutral-900">{stats.inactive}</div>
                      <div className="text-xs text-neutral-600 mt-1">Unsubscribed</div>
                    </div>
                  </div>

                  <div className="bg-neutral-900 text-white p-4 rounded-lg">
                    <div className="text-sm font-medium mb-1">Total Reach</div>
                    <div className="text-3xl font-bold">{stats.total.toLocaleString()}</div>
                    <div className="text-xs text-neutral-300 mt-1">All-time subscribers</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Subscribers List */}
        <Card className="border-neutral-200">
          <CardHeader>
            <CardTitle className="text-neutral-900">Subscribers Directory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider hidden md:table-cell">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider hidden lg:table-cell">Subscribed</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider hidden xl:table-cell">Last Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-neutral-100 rounded">
                            <Mail className="h-3.5 w-3.5 text-neutral-600" />
                          </div>
                          <span className="text-sm font-medium text-neutral-900">{sub.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge 
                          variant={sub.isActive ? 'default' : 'secondary'}
                          className={sub.isActive ? 'bg-neutral-900 hover:bg-neutral-800' : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'}
                        >
                          {sub.isActive ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <UserX className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-sm text-neutral-600 hidden md:table-cell">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                          {sub.source || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-neutral-600 hidden lg:table-cell">
                        {formatDate(sub.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-sm text-neutral-600 hidden xl:table-cell">
                        {sub.unsubscribedAt ? formatDate(sub.unsubscribedAt) : <span className="text-neutral-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-200">
                <p className="text-sm text-neutral-600">
                  Showing <span className="font-semibold text-neutral-900">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                  <span className="font-semibold text-neutral-900">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                  <span className="font-semibold text-neutral-900">{pagination.total}</span> subscribers
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="border-neutral-300 hover:bg-neutral-100 disabled:opacity-50"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={currentPage === pagination.totalPages}
                    className="border-neutral-300 hover:bg-neutral-100 disabled:opacity-50"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}