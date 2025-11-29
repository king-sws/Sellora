/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */

// app/(dashboard)/dashboard/reviews/page.tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  Star, StarHalf, Search, Filter, Eye, Trash2, 
  Shield, ShieldCheck, ChevronLeft, ChevronRight,
  MoreVertical, ExternalLink, User, Calendar,
  TrendingUp, Award, AlertCircle, RefreshCw,
  SlidersHorizontal, ChevronDown, Download,
  MessageSquare, ThumbsUp, Flag, CheckCircle2,
  XCircle, BarChart3, Users, Package, Target,
  EyeOff, Loader2, FileText, Share2, TrendingDown
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

// shadcn/ui imports
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Review {
  id: string
  rating: number
  title: string | null
  comment: string | null
  isVerified: boolean
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
  product: {
    id: string
    name: string
    slug: string
    images: string[]
    price: number
  }
}

interface ReviewStats {
  totalReviews: number
  averageRating: number
  verifiedReviews: number
  verificationRate: number
  ratingDistribution: Record<number, number>
}

interface ReviewsData {
  reviews: Review[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  stats: ReviewStats
}

export default function AdminReviewsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [data, setData] = useState<ReviewsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [activeTab, setActiveTab] = useState('all')
  const [hiddenMetrics, setHiddenMetrics] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // URL parameters
  const currentPage = parseInt(searchParams.get('page') || '1')
  const ratingFilter = searchParams.get('rating') || 'all'
  const verifiedFilter = searchParams.get('verified') || 'all'
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  // Auto-refresh every 5 minutes if enabled
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => {
      fetchReviews()
      toast.success('Reviews refreshed automatically')
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault()
        fetchReviews()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault()
        handleExport()
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [data])

  useEffect(() => {
    if (session?.user?.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchReviews()
  }, [session, router, searchParams])

  const fetchReviews = async () => {
    try {
      setRefreshing(true)
      const params = new URLSearchParams(searchParams)
      const response = await fetch(`/api/admin/reviews?${params}`)
      
      if (response.ok) {
        const reviewsData = await response.json()
        setData(reviewsData)
        if (!loading) {
          toast.success('Reviews refreshed')
        }
      } else {
        toast.error('Failed to load reviews')
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
      toast.error('Error fetching reviews')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const updateURL = (params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams)
    
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === '') {
        newParams.delete(key)
      } else {
        newParams.set(key, value)
      }
    })
    
    if ('page' in params === false) {
      newParams.delete('page')
    }
    
    router.push(`/dashboard/reviews?${newParams.toString()}`)
  }

  const handleSearch = () => {
    updateURL({ search: searchTerm })
  }

  const handleFilterChange = (key: string, value: string) => {
    const apiValue = value === 'all' ? '' : value
    updateURL({ [key]: apiValue })
  }

  const handleSort = (field: string) => {
    const newOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc'
    updateURL({ sortBy: field, sortOrder: newOrder })
  }

  const handleVerificationToggle = async (reviewId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reviewId, 
          isVerified: !currentStatus 
        })
      })

      if (response.ok) {
        toast.success(`Review ${!currentStatus ? 'verified' : 'unverified'} successfully`)
        fetchReviews()
      } else {
        toast.error('Failed to update review')
      }
    } catch (error) {
      console.error('Error updating review:', error)
      toast.error('Error updating review')
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) return

    try {
      const response = await fetch(`/api/admin/reviews?id=${reviewId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Review deleted successfully')
        fetchReviews()
      } else {
        toast.error('Failed to delete review')
      }
    } catch (error) {
      console.error('Error deleting review:', error)
      toast.error('Error deleting review')
    }
  }

  const handleBulkAction = async (action: 'verify' | 'unverify' | 'delete') => {
    if (selectedReviews.size === 0) {
      toast.error('Please select reviews first')
      return
    }

    if (action === 'delete' && !confirm(`Delete ${selectedReviews.size} reviews? This cannot be undone.`)) {
      return
    }

    try {
      const promises = Array.from(selectedReviews).map(reviewId => {
        if (action === 'delete') {
          return fetch(`/api/admin/reviews?id=${reviewId}`, { method: 'DELETE' })
        } else {
          return fetch('/api/admin/reviews', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              reviewId, 
              isVerified: action === 'verify' 
            })
          })
        }
      })

      await Promise.all(promises)
      toast.success(`${selectedReviews.size} reviews ${action === 'delete' ? 'deleted' : action === 'verify' ? 'verified' : 'unverified'}`)
      setSelectedReviews(new Set())
      fetchReviews()
    } catch (error) {
      toast.error('Failed to perform bulk action')
    }
  }

  const handleExport = () => {
    if (!data) {
      toast.error('No data to export')
      return
    }

    setIsExporting(true)
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        stats: data.stats,
        reviews: data.reviews.map(r => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          comment: r.comment,
          isVerified: r.isVerified,
          createdAt: r.createdAt,
          user: r.user.name || r.user.email,
          product: r.product.name,
          productPrice: r.product.price
        }))
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reviews-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Reviews exported successfully')
    } catch (error) {
      toast.error('Failed to export data')
    } finally {
      setIsExporting(false)
    }
  }

  const toggleMetric = (metric: string) => {
    setHiddenMetrics(prev => {
      const newSet = new Set(prev)
      if (newSet.has(metric)) {
        newSet.delete(metric)
      } else {
        newSet.add(metric)
      }
      return newSet
    })
  }

  const renderStars = (rating: number, size: 'sm' | 'md' = 'sm') => {
    const stars = []
    const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
    
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(
          <Star key={i} className={`${sizeClass} fill-yellow-400 text-yellow-400`} />
        )
      } else if (i - 0.5 <= rating) {
        stars.push(
          <StarHalf key={i} className={`${sizeClass} fill-yellow-400 text-yellow-400`} />
        )
      } else {
        stars.push(
          <Star key={i} className={`${sizeClass} text-muted-foreground`} />
        )
      }
    }
    return <div className="flex items-center gap-0.5">{stars}</div>
  }

  // Calculate insights
  const insights = useMemo(() => {
    if (!data) return []
    const insights: Array<{ type: 'success' | 'warning' | 'info'; message: string }> = []
    
    if (data.stats.averageRating >= 4.5) {
      insights.push({ type: 'success', message: `Excellent rating! Average is ${data.stats.averageRating.toFixed(1)} stars 🎉` })
    } else if (data.stats.averageRating < 3.5) {
      insights.push({ type: 'warning', message: `Low average rating (${data.stats.averageRating.toFixed(1)}). Consider reviewing products.` })
    }
    
    if (data.stats.verificationRate < 50) {
      insights.push({ type: 'warning', message: `Only ${data.stats.verificationRate.toFixed(1)}% of reviews are verified.` })
    } else if (data.stats.verificationRate > 80) {
      insights.push({ type: 'success', message: `High verification rate: ${data.stats.verificationRate.toFixed(1)}%` })
    }
    
    const fiveStarRate = data.stats.totalReviews > 0 
      ? ((data.stats.ratingDistribution[5] || 0) / data.stats.totalReviews) * 100 
      : 0
    if (fiveStarRate > 60) {
      insights.push({ type: 'info', message: `${fiveStarRate.toFixed(1)}% of reviews are 5-star!` })
    }
    
    const lowRatings = (data.stats.ratingDistribution[1] || 0) + (data.stats.ratingDistribution[2] || 0)
    if (lowRatings > data.stats.totalReviews * 0.2) {
      insights.push({ type: 'warning', message: `${lowRatings} low-rating reviews need attention.` })
    }
    
    return insights
  }, [data])

  // Filter reviews by tab
  const filteredReviews = useMemo(() => {
    if (!data) return []
    
    switch (activeTab) {
      case 'verified':
        return data.reviews.filter(r => r.isVerified)
      case 'unverified':
        return data.reviews.filter(r => !r.isVerified)
      case 'high':
        return data.reviews.filter(r => r.rating >= 4)
      case 'low':
        return data.reviews.filter(r => r.rating <= 2)
      default:
        return data.reviews
    }
  }, [data, activeTab])

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardContent className="p-4 md:p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Failed to load reviews</h3>
            <p className="text-muted-foreground mb-4">
              Unable to fetch reviews data. Please try again.
            </p>
            <Button onClick={fetchReviews} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <MessageSquare className="h-7 w-7 text-blue-600" />
              Reviews Management
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Manage and moderate customer reviews
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <kbd className="px-2 py-1 bg-gray-100 border rounded">Ctrl+R</kbd>
              <span>Refresh</span>
              <kbd className="px-2 py-1 bg-gray-100 border rounded">Ctrl+E</kbd>
              <span>Export</span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                setAutoRefresh(!autoRefresh)
                toast.success(autoRefresh ? 'Auto-refresh disabled' : 'Auto-refresh enabled (every 5min)')
              }}
              variant="outline"
              size="sm"
              className={autoRefresh ? 'border-green-500 text-green-600' : ''}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto
            </Button>
            
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export
            </Button>
            
            <Button 
              onClick={fetchReviews} 
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
                variant={insight.type === 'warning' ? 'destructive' : 'default'}
                className={
                  insight.type === 'success' ? 'border-green-200 bg-green-50' :
                  insight.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                  'border-blue-200 bg-blue-50'
                }
              >
                {insight.type === 'success' && <TrendingUp className="h-4 w-4 text-green-600" />}
                {insight.type === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                {insight.type === 'info' && <Target className="h-4 w-4 text-blue-600" />}
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

        {/* Stats Cards */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Key Metrics</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (hiddenMetrics.size > 0) {
                  setHiddenMetrics(new Set())
                } else {
                  setHiddenMetrics(new Set(['total', 'average', 'verified', 'fivestar']))
                }
              }}
            >
              {hiddenMetrics.size > 0 ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {!hiddenMetrics.has('total') && (
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => toggleMetric('total')}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <Star className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Reviews</p>
                      <p className="text-xl md:text-2xl font-bold">
                        {data.stats.totalReviews.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!hiddenMetrics.has('average') && (
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => toggleMetric('average')}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Rating</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xl md:text-2xl font-bold">
                          {data.stats.averageRating.toFixed(1)}
                        </p>
                        <div className="hidden sm:block">
                          {renderStars(Math.round(data.stats.averageRating), 'sm')}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!hiddenMetrics.has('verified') && (
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => toggleMetric('verified')}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <ShieldCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Verified</p>
                      <p className="text-xl md:text-2xl font-bold">
                        {data.stats.verifiedReviews}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {data.stats.verificationRate.toFixed(1)}% verified
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!hiddenMetrics.has('fivestar') && (
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => toggleMetric('fivestar')}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">5-Star Reviews</p>
                      <p className="text-xl md:text-2xl font-bold">
                        {data.stats.ratingDistribution[5] || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {data.stats.totalReviews > 0 
                          ? ((data.stats.ratingDistribution[5] || 0) / data.stats.totalReviews * 100).toFixed(1)
                          : 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[5, 4, 3, 2, 1].map(rating => {
              const count = data.stats.ratingDistribution[rating] || 0
              const percentage = data.stats.totalReviews > 0 ? (count / data.stats.totalReviews) * 100 : 0
              
              return (
                <div key={rating} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="flex items-center gap-1 w-full sm:w-16">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <Progress value={percentage} className="h-2" />
                  </div>
                  <div className="flex justify-between sm:justify-end gap-4 sm:gap-2">
                    <span className="text-sm text-muted-foreground sm:w-12 sm:text-right">
                      {count}
                    </span>
                    <span className="text-sm text-muted-foreground sm:w-12 sm:text-right">
                      ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search reviews, users, or products..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch()
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={handleSearch}
                  size="sm"
                  className="sm:order-last"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
                
                <Select value={ratingFilter || undefined} onValueChange={(value) => handleFilterChange('rating', value)}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="All Reviews" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reviews</SelectItem>
                    <SelectItem value="true">Verified Only</SelectItem>
                    <SelectItem value="false">Unverified Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedReviews.size > 0 && (
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
            <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <AlertTitle className="text-blue-900 dark:text-blue-100">
              {selectedReviews.size} review{selectedReviews.size > 1 ? 's' : ''} selected
            </AlertTitle>
            <AlertDescription>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('verify')}
                  className="bg-white dark:bg-slate-900 text-xs sm:text-sm"
                >
                  <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Verify All</span>
                  <span className="xs:hidden">Verify</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('unverify')}
                  className="bg-white dark:bg-slate-900 text-xs sm:text-sm"
                >
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Unverify All</span>
                  <span className="xs:hidden">Unverify</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('delete')}
                  className="bg-white dark:bg-slate-900 text-red-600 hover:text-red-700 text-xs sm:text-sm"
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Delete All</span>
                  <span className="xs:hidden">Delete</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedReviews(new Set())}
                  className="text-xs sm:text-sm"
                >
                  Clear
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Reviews with Tabs */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg md:text-xl">
                Reviews ({data.pagination.total})
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                Showing {((data.pagination.page - 1) * data.pagination.limit) + 1}-
                {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of {data.pagination.total}
              </div>
            </div>
          </CardHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-4 md:px-6">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 gap-2">
                <TabsTrigger value="all" className="text-xs sm:text-sm">
                  All ({data.reviews.length})
                </TabsTrigger>
                <TabsTrigger value="verified" className="text-xs sm:text-sm">
                  Verified ({data.reviews.filter(r => r.isVerified).length})
                </TabsTrigger>
                <TabsTrigger value="unverified" className="text-xs sm:text-sm">
                  Unverified ({data.reviews.filter(r => !r.isVerified).length})
                </TabsTrigger>
                <TabsTrigger value="high" className="text-xs sm:text-sm">
                  High (4-5★)
                </TabsTrigger>
                <TabsTrigger value="low" className="text-xs sm:text-sm">
                  Low (1-2★)
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="mt-0">
              <CardContent className="p-0">
                {filteredReviews.length === 0 ? (
                  <div className="p-8 text-center">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No reviews found in this category</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredReviews.map((review) => (
                      <div key={review.id} className="p-4 md:p-6 hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col gap-4">
                          {/* Selection and Review Content */}
                          <div className="flex items-start gap-3 w-full">
                            <input
                              type="checkbox"
                              checked={selectedReviews.has(review.id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedReviews)
                                if (e.target.checked) {
                                  newSelected.add(review.id)
                                } else {
                                  newSelected.delete(review.id)
                                }
                                setSelectedReviews(newSelected)
                              }}
                              className="mt-1 h-4 w-4 rounded border-gray-300 cursor-pointer flex-shrink-0"
                            />

                            <div className="flex-1 min-w-0 space-y-3">
                              {/* Review Header */}
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-2">
                                  {renderStars(review.rating)}
                                  <span className="text-sm font-medium whitespace-nowrap">
                                    {review.rating}/5
                                  </span>
                                </div>
                                {review.isVerified && (
                                  <Badge variant="secondary" className="flex-shrink-0">
                                    <ShieldCheck className="w-3 h-3 mr-1" />
                                    Verified
                                  </Badge>
                                )}
                                <span className="text-sm text-muted-foreground whitespace-nowrap">
                                  {formatDate(review.createdAt, 'long')}
                                </span>
                              </div>

                              {/* Review Content */}
                              {review.title && (
                                <h4 className="font-medium text-foreground break-words">
                                  {review.title}
                                </h4>
                              )}
                              {review.comment && (
                                <div className="text-foreground leading-relaxed break-words whitespace-pre-wrap overflow-hidden">
                                  <p className="line-clamp-3 lg:line-clamp-4">
                                    {review.comment}
                                  </p>
                                </div>
                              )}

                              {/* User and Product Info */}
                              <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Avatar className="w-5 h-5 flex-shrink-0">
                                    <AvatarImage src={review.user.image || undefined} />
                                    <AvatarFallback className="text-xs">
                                      {review.user.name?.[0] || review.user.email?.[0] || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="truncate">
                                    {review.user.name || review.user.email || 'Anonymous User'}
                                  </span>
                                </div>
                                <Separator orientation="vertical" className="hidden sm:block h-5" />
                                <Link 
                                  href={`/dashboard/products/${review.product.id}`}
                                  className="flex items-center gap-2 hover:text-foreground transition-colors min-w-0"
                                >
                                  <ExternalLink className="w-4 h-4 flex-shrink-0" />
                                  <span className="truncate">{review.product.name}</span>
                                </Link>
                              </div>
                            </div>
                          </div>

                          {/* Product Image & Actions - Separate Row on Mobile */}
                          <div className="flex items-center justify-between gap-4 pl-7">
                            {review.product.images?.[0] && (
                              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                                <img
                                  src={review.product.images[0]}
                                  alt={review.product.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            
                            {/* Actions */}
                            <div className="flex items-center gap-1 sm:gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleVerificationToggle(review.id, review.isVerified)}
                                    className={review.isVerified 
                                      ? 'text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/20 h-8 w-8 sm:h-9 sm:w-9' 
                                      : 'text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9'
                                    }
                                  >
                                    {review.isVerified 
                                      ? <ShieldCheck className="w-4 h-4" /> 
                                      : <Shield className="w-4 h-4" />
                                    }
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {review.isVerified ? 'Remove verification' : 'Mark as verified'}
                                </TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteReview(review.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20 h-8 w-8 sm:h-9 sm:w-9"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Delete review
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {data.pagination.pages > 1 && (
                  <div className="p-4 md:p-6 border-t">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{' '}
                        {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
                        {data.pagination.total} results
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateURL({ page: (data.pagination.page - 1).toString() })}
                          disabled={data.pagination.page <= 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span className="hidden sm:inline ml-2">Previous</span>
                        </Button>
                        
                        <span className="px-4 py-2 text-sm font-medium">
                          {data.pagination.page} of {data.pagination.pages}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateURL({ page: (data.pagination.page + 1).toString() })}
                          disabled={data.pagination.page >= data.pagination.pages}
                        >
                          <span className="hidden sm:inline mr-2">Next</span>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Quick Actions</CardTitle>
            <CardDescription>Common review management tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => handleFilterChange('verified', 'false')}
              >
                <Shield className="w-4 h-4 mr-2" />
                View Unverified
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => handleFilterChange('rating', '1-2')}
              >
                <TrendingDown className="w-4 h-4 mr-2" />
                View Low Ratings
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => handleSort('createdAt')}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Sort by Date
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => handleFilterChange('rating', '5')}
              >
                <Award className="w-4 h-4 mr-2" />
                View 5-Star
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Review Statistics Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Review Trends</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                  <p className="text-2xl font-bold text-blue-600">{data.stats.averageRating.toFixed(2)}</p>
                </div>
                <TrendingUp className={`w-8 h-8 ${data.stats.averageRating >= 4 ? 'text-green-600' : 'text-yellow-600'}`} />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Verification Rate</p>
                  <p className="text-2xl font-bold text-green-600">{data.stats.verificationRate.toFixed(1)}%</p>
                </div>
                <ShieldCheck className="w-8 h-8 text-green-600" />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Reviews</p>
                  <p className="text-2xl font-bold text-purple-600">{data.stats.totalReviews}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Rated Products</CardTitle>
              <CardDescription>Products with highest average ratings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Alert className="border-green-200 bg-green-50">
                  <Award className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    View detailed product analytics in the Analytics Dashboard
                  </AlertDescription>
                </Alert>
                <Link href="/analytics">
                  <Button variant="outline" className="w-full">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Analytics Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}