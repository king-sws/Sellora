/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(dashboard)/dashboard/products/[id]/page.tsx
// Fixed version with REAL sales data

import { notFound } from 'next/navigation'
import { prisma } from '@/db/prisma'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  ArrowLeft, Edit, Star, Package, ShoppingCart, Eye, DollarSign,
  TrendingUp, AlertCircle, CheckCircle2, XCircle, Clock, 
  MessageSquare, Heart, Tag, Activity, Users, Calendar,
  Award, Zap, Target, Download, Copy, ExternalLink, TrendingDown,
  AlertTriangle, Lightbulb, FileText, Archive, Image as ImageIcon,
  BarChart3, Crown,
  History
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ImageGallery } from '@/components/store/ImageGallery'

interface ProductDetailPageProps {
  params: {
    id: string
  }
}

function calculatePerformanceScore(
  product: any,
  averageRating: number,
  conversionRate: number,
  realSales: number
): number {
  let score = 0
  if (product.stock > 20) score += 20
  else if (product.stock > 10) score += 15
  else if (product.stock > 0) score += 10
  
  if (product._count.reviews > 0) {
    score += Math.min((product._count.reviews / 10) * 10, 10)
    score += (averageRating / 5) * 20
  }
  
  // Use REAL sales instead of all order items
  if (realSales > 0) {
    score += Math.min((realSales / 50) * 25, 25)
  }
  
  if (conversionRate > 0) {
    score += Math.min(conversionRate * 3, 15)
  }
  
  if (product.images.length > 0) {
    score += Math.min(product.images.length * 2, 10)
  }
  
  return Math.min(Math.round(score), 100)
}

function getPerformanceBadge(score: number) {
  if (score >= 90) {
    return { label: 'Excellent', className: 'border-green-500 text-green-700 bg-green-50' }
  } else if (score >= 70) {
    return { label: 'Good', className: 'border-blue-500 text-blue-700 bg-blue-50' }
  } else if (score >= 50) {
    return { label: 'Needs Work', className: 'border-yellow-500 text-yellow-700 bg-yellow-50' }
  } else if (score < 50) {
    return { label: 'Critical', className: 'border-red-500 text-red-700 bg-red-50' }
  }
  return null
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      category: { include: { parent: true } },
      brand: true,
      variants: {
        where: { isActive: true },
        include: { _count: { select: { orderItems: true } } }
      },
      reviews: {
        include: { user: { select: { name: true, image: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20
      },
      inventoryLogs: {
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { changedByUser: { select: { name: true, email: true } } }
      },
      _count: {
        select: { 
          reviews: true, 
          orderItems: true, 
          wishlistItems: true, 
          cartItems: true, 
          variants: true 
        }
      }
    }
  })

  if (!product) {
    notFound()
  }

  // ✅ FIX: Get REAL sales data (only confirmed/completed orders)
  const realSalesData = await prisma.orderItem.aggregate({
    where: {
      productId: product.id,
      order: {
        status: {
          in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']
        }
      }
    },
    _sum: {
      quantity: true,
      price: true
    },
    _count: {
      id: true
    }
  })

  const realSalesQuantity = realSalesData._sum.quantity || 0
  const realRevenue = realSalesData._sum.price || 0
  const realOrderCount = realSalesData._count.id || 0

  // ✅ Get real sales for variants too
  const variantSalesData = await prisma.orderItem.groupBy({
    by: ['variantId'],
    where: {
      productId: product.id,
      variantId: { not: null },
      order: {
        status: {
          in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']
        }
      }
    },
    _sum: {
      quantity: true
    }
  })

  const variantSalesMap = new Map(
    variantSalesData.map(item => [item.variantId, item._sum.quantity || 0])
  )

  const averageRating = product.reviews.length > 0
    ? product.reviews.reduce((acc, review) => acc + review.rating, 0) / product.reviews.length
    : 0

  const ratingDistribution = {
    5: product.reviews.filter(r => r.rating === 5).length,
    4: product.reviews.filter(r => r.rating === 4).length,
    3: product.reviews.filter(r => r.rating === 3).length,
    2: product.reviews.filter(r => r.rating === 2).length,
    1: product.reviews.filter(r => r.rating === 1).length,
  }

  // ✅ Use REAL revenue and sales
  const totalRevenue = realRevenue
  const conversionRate = product.viewCount > 0 
    ? (realSalesQuantity / product.viewCount * 100).toFixed(2)
    : '0.00'

  const stockStatus = product.stock === 0 
    ? { label: 'Out of Stock', variant: 'destructive' as const, icon: XCircle }
    : product.stock <= 10 
    ? { label: 'Low Stock', variant: 'warning' as const, icon: AlertCircle }
    : { label: 'In Stock', variant: 'success' as const, icon: CheckCircle2 }

  // Enhanced insights with REAL data
  const insights: Array<{ 
    type: 'success' | 'warning' | 'info' | 'error'
    title: string
    message: string
    actionLabel?: string
    actionHref?: string
  }> = []

  if (averageRating >= 4.5 && product._count.reviews > 5) {
    insights.push({
      type: 'success',
      title: 'Excellent Customer Ratings',
      message: `Your product maintains a ${averageRating.toFixed(1)}/5 rating with ${product._count.reviews} reviews.`,
      actionLabel: 'View Reviews',
      actionHref: `#reviews`
    })
  }

  if (product.stock === 0) {
    insights.push({
      type: 'error',
      title: 'Out of Stock',
      message: 'Product is currently unavailable. This may result in lost sales.',
      actionLabel: 'Update Stock',
      actionHref: `/dashboard/products/${product.id}/edit`
    })
  } else if (product.stock <= 10) {
    insights.push({
      type: 'warning',
      title: 'Low Stock Alert',
      message: `Only ${product.stock} units remaining. Consider restocking soon.`,
      actionLabel: 'Restock',
      actionHref: `/dashboard/products/${product.id}/edit`
    })
  }

  if (parseFloat(conversionRate) < 1 && product.viewCount > 100) {
    insights.push({
      type: 'info',
      title: 'Low Conversion Rate',
      message: `${product.viewCount} views but only ${realSalesQuantity} sales (${conversionRate}%). Consider optimizing listing.`,
      actionLabel: 'Optimize',
      actionHref: `/dashboard/products/${product.id}/edit`
    })
  }

  // High wishlist interest
  if (product._count.wishlistItems > realSalesQuantity && product._count.wishlistItems > 10) {
    insights.push({
      type: 'info',
      title: 'High Wishlist Demand',
      message: `${product._count.wishlistItems} customers wishlisted this. Consider running a promotion to convert them!`,
      actionLabel: 'Create Deal',
      actionHref: `/dashboard/products/${product.id}/edit`
    })
  }

  if (product.images.length === 0) {
    insights.push({
      type: 'warning',
      title: 'Missing Product Images',
      message: 'Products with images convert 3x better. Add high-quality photos now.',
      actionLabel: 'Add Images',
      actionHref: `/dashboard/products/${product.id}/edit`
    })
  }

  // No reviews on popular product
  if (realSalesQuantity > 10 && product._count.reviews === 0) {
    insights.push({
      type: 'info',
      title: 'Request Customer Reviews',
      message: `${realSalesQuantity} confirmed sales but no reviews yet. Encourage customers to leave feedback.`,
      actionLabel: 'Send Request',
      actionHref: `/dashboard/products/${product.id}/reviews`
    })
  }

  const performanceScore = calculatePerformanceScore(
    product, 
    averageRating, 
    parseFloat(conversionRate),
    realSalesQuantity
  )
  const performanceBadge = getPerformanceBadge(performanceScore)

  const InfoItem = ({ label, value }: { label: string; value: string }) => (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  )

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
    </div>
  )

  const StatusIcon = stockStatus.icon

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                  <div className="flex items-center flex-1">
                    <Button variant="ghost" size="icon" asChild className="mr-4">
                      <Link href="/dashboard/products">
                        <ArrowLeft className="w-5 h-5" />
                      </Link>
                    </Button>
                    <div className="flex items-center">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg mr-4">
                        <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100">
                          {product.name.length > 50 ? `${product.name.slice(0, 45)}...` : product.name}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                          Product analytics and management
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" asChild className="hidden sm:flex">
                      <Link href={`/dashboard/products`}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View All
                      </Link>
                    </Button>
                    <Button asChild className="w-full sm:w-auto">
                      <Link href={`/dashboard/products/${product.id}/edit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Product
                      </Link>
                    </Button>
                  </div>
                </div>

      {/* Smart Insights */}
      {insights.length > 0 && (
  <div className="space-y-4 mb-6">
    {insights.map((insight, index) => {
      const IconComponent =
        insight.type === "success"
          ? Award
          : insight.type === "warning"
          ? AlertCircle
          : insight.type === "error"
          ? XCircle
          : Lightbulb

      return (
        <Alert
          key={index}
          className={cn(
            "rounded-xl border p-5 flex items-start gap-4 transition-all duration-200 hover:shadow-md bg-opacity-80",
            insight.type === "success"
              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
              : insight.type === "warning"
              ? "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20"
              : insight.type === "error"
              ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
              : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
          )}
        >
          {/* Icon Bubble */}
          <div
            className={cn(
              "flex items-center justify-center rounded-full h-10 w-10 flex-shrink-0",
              insight.type === "success"
                ? "bg-green-100 dark:bg-green-800/50"
                : insight.type === "warning"
                ? "bg-yellow-100 dark:bg-yellow-800/50"
                : insight.type === "error"
                ? "bg-red-100 dark:bg-red-800/50"
                : "bg-blue-100 dark:bg-blue-800/50"
            )}
          >
            <IconComponent
              className={cn(
                "h-5 w-5",
                insight.type === "success"
                  ? "text-green-600 dark:text-green-300"
                  : insight.type === "warning"
                  ? "text-yellow-600 dark:text-yellow-300"
                  : insight.type === "error"
                  ? "text-red-600 dark:text-red-300"
                  : "text-blue-600 dark:text-blue-300"
              )}
            />
          </div>

          {/* Text & Action */}
          <div className="flex-1 space-y-2">
            <AlertTitle
              className={cn(
                "text-base font-semibold leading-snug",
                insight.type === "success"
                  ? "text-green-900 dark:text-green-100"
                  : insight.type === "warning"
                  ? "text-yellow-900 dark:text-yellow-100"
                  : insight.type === "error"
                  ? "text-red-900 dark:text-red-100"
                  : "text-blue-900 dark:text-blue-100"
              )}
            >
              {insight.title}
            </AlertTitle>

            <AlertDescription
              className={cn(
                "text-sm leading-relaxed max-w-prose",
                insight.type === "success"
                  ? "text-green-700 dark:text-green-300"
                  : insight.type === "warning"
                  ? "text-yellow-700 dark:text-yellow-300"
                  : insight.type === "error"
                  ? "text-red-700 dark:text-red-300"
                  : "text-blue-700 dark:text-blue-300"
              )}
            >
              {insight.message}
            </AlertDescription>

            {insight.actionLabel && insight.actionHref && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className={cn(
                    "rounded-lg text-sm font-medium transition-colors duration-200",
                    insight.type === "success"
                      ? "border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/40"
                      : insight.type === "warning"
                      ? "border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-300 dark:hover:bg-yellow-900/40"
                      : insight.type === "error"
                      ? "border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/40"
                      : "border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/40"
                  )}
                >
                  <Link href={insight.actionHref}>{insight.actionLabel}</Link>
                </Button>
              </div>
            )}
          </div>
        </Alert>
      )
    })}
  </div>
)}


      {/* Key Stats - NOW WITH REAL DATA */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  ${totalRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{realSalesQuantity} units sold</p>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Stock Status</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{product.stock}</p>
                <Badge variant={stockStatus.variant} className="mt-1 text-xs">
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {stockStatus.label}
                </Badge>
              </div>
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg flex-shrink-0">
                <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg Rating</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {averageRating.toFixed(1)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {renderStars(averageRating)}
                </div>
              </div>
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex-shrink-0">
                <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Conversion</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{conversionRate}%</p>
                <p className="text-xs text-gray-500 mt-1">{product.viewCount} views</p>
              </div>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex-shrink-0">
                <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Product Image */}
          {product.images.length > 0 ? (
            <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <ImageGallery
                images={product.images} 
                productName={product.name}
                enableZoom
              />
            </div>
          ) : (
            <Card className="aspect-square border-dashed">
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm mb-2">No image</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/products/${product.id}/edit`}>
                      Add Image
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Score */}
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Performance Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                  {performanceScore}
                  <span className="text-lg text-gray-500">/100</span>
                </div>
                {performanceBadge && (
                  <Badge className={performanceBadge.className + ' mb-3'}>
                    {performanceBadge.label}
                  </Badge>
                )}
                <Progress value={performanceScore} className="h-2" />
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  {performanceScore >= 80 ? 'Excellent performance!' :
                   performanceScore >= 60 ? 'Good, can be improved' :
                   performanceScore >= 40 ? 'Needs optimization' :
                   'Requires attention'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats - WITH REAL SALES */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Confirmed Sales</span>
                </div>
                <Badge variant="outline">{realSalesQuantity}</Badge>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Wishlist</span>
                </div>
                <Badge variant="outline">{product._count.wishlistItems}</Badge>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Reviews</span>
                </div>
                <Badge variant="outline">{product._count.reviews}</Badge>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-purple-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">In Carts</span>
                </div>
                <Badge variant="outline">{product._count.cartItems}</Badge>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Page Views</span>
                </div>
                <Badge variant="outline">{product.viewCount}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Analytics Summary - WITH REAL DATA */}
          {/* <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Views</p>
                  <p className="text-2xl font-bold">{product.viewCount}</p>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Confirmed Orders</p>
                  <p className="text-2xl font-bold">{realOrderCount}</p>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Wishlist Adds</p>
                  <p className="text-2xl font-bold">{product._count.wishlistItems}</p>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg Order Value</p>
                  <p className="text-2xl font-bold">
                    ${realOrderCount > 0 ? (totalRevenue / realOrderCount).toFixed(0) : '0'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card> */}
        </div>

        {/* Right Column - Rest of the code remains the same but update variants to show real sales */}
        <div className="lg:col-span-2 space-y-8">
          {/* Product Info Card - Same as before */}
          <Card className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex flex-wrap items-center gap-2 px-6 pt-4">
              {product.isFeatured && (
                <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium">
                  <Crown className="w-3 h-3 mr-1" />
                  Featured
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-medium rounded-full px-3 py-0.5 border",
                  product.isActive
                    ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                    : "text-gray-600 border-gray-300 bg-gray-50"
                )}
              >
                {product.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            <CardHeader className="p-6 border-b bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-50">
                  {product.name}
                </CardTitle>
                {product.description && (
                  <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {product.description}
                  </CardDescription>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-8">
              <div className="flex flex-wrap items-baseline gap-3">
                <div className="text-3xl font-semibold text-emerald-600 dark:text-emerald-400">
                  ${product.price.toFixed(2)}
                </div>
                {product.comparePrice && product.comparePrice > product.price && (
                  <>
                    <div className="text-lg text-gray-400 line-through">
                      ${product.comparePrice.toFixed(2)}
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-medium">
                      <Zap className="w-3 h-3 mr-1" />
                      Save ${(product.comparePrice - product.price).toFixed(2)} (
                      {Math.round(
                        ((product.comparePrice - product.price) / product.comparePrice) * 100
                      )}
                      % off)
                    </Badge>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <InfoItem label="SKU" value={product.sku || "N/A"} />
                <InfoItem label="Category" value={product.category?.name || "Uncategorized"} />
                <InfoItem label="Brand" value={product.brand?.name || "No brand"} />
                <InfoItem label="Weight" value={product.weight ? `${product.weight} kg` : "N/A"} />
                <InfoItem
                  label="Created"
                  value={product.createdAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                />
                <InfoItem
                  label="Updated"
                  value={product.updatedAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                />
              </div>

              {product.tags?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag) => (
                      <Badge
                        key={tag}
                        className="rounded-full bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 text-xs px-2.5 py-0.5"
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="reviews" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="reviews">
                <Star className="h-4 w-4 mr-2" />
                Reviews ({product._count.reviews})
              </TabsTrigger>
              <TabsTrigger value="variants">
                <Tag className="h-4 w-4 mr-2" />
                Variants ({product._count.variants})
              </TabsTrigger>
              <TabsTrigger value="inventory">
                <Activity className="h-4 w-4 mr-2" />
                Inventory
              </TabsTrigger>
            </TabsList>

            {/* Reviews Tab */}
            <TabsContent value="reviews" className="space-y-4 mt-6">
              {product._count.reviews > 0 ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Rating Summary</CardTitle>
                      <CardDescription>
                        {product._count.reviews} customer {product._count.reviews === 1 ? 'review' : 'reviews'} with an average of {averageRating.toFixed(1)} stars
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[5, 4, 3, 2, 1].map((rating) => {
                          const count = ratingDistribution[rating as keyof typeof ratingDistribution]
                          const percentage = product._count.reviews > 0 ? (count / product._count.reviews) * 100 : 0
                          
                          return (
                            <div key={rating} className="flex items-center gap-3">
                              <div className="flex items-center gap-1 w-12">
                                <span className="text-sm font-medium">{rating}</span>
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              </div>
                              <Progress 
                                value={percentage} 
                                className="flex-1 h-2"
                              />
                              <span className="text-sm text-gray-500 dark:text-gray-400 w-12 text-right">
                                {count} ({percentage.toFixed(0)}%)
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Customer Reviews</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {product.reviews.slice(0, 5).map((review, idx) => (
                        <div key={review.id}>
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={review.user.image || ''} />
                              <AvatarFallback>{review.user.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                                <p className="font-medium text-sm">{review.user.name || 'Anonymous'}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {review.createdAt.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric' 
                                  })}
                                </p>
                              </div>
                              <div className="flex items-center gap-0.5 mb-2">
                                {renderStars(review.rating)}
                              </div>
                              {review.title && (
                                <h4 className="font-medium text-sm mb-1">{review.title}</h4>
                              )}
                              {review.comment && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                  {review.comment}
                                </p>
                              )}
                            </div>
                          </div>
                          {idx < product.reviews.slice(0, 5).length - 1 && (
                            <Separator className="mt-4" />
                          )}
                        </div>
                      ))}
                      
                      {product.reviews.length > 5 && (
                        <div className="pt-2">
                          <Button variant="outline" className="w-full" size="sm">
                            View All {product.reviews.length} Reviews
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium mb-1">No reviews yet</p>
                    <p className="text-xs">Be the first to encourage customers to leave feedback!</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Variants Tab - WITH REAL SALES */}
            <TabsContent value="variants" className="space-y-4 mt-6">
              {product.variants.length > 0 ? (
                <>
                  {product.variants.map((variant) => {
                    const variantRealSales = variantSalesMap.get(variant.id) || 0
                    
                    return (
                      <Card key={variant.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <h4 className="font-semibold">{variant.name}</h4>
                                <Badge variant={variant.isActive ? "default" : "secondary"} className="text-xs">
                                  {variant.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                SKU: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">{variant.sku}</code>
                              </p>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">Price</p>
                                  <p className="font-semibold text-green-600 dark:text-green-400">
                                    ${(variant.price || product.price).toFixed(2)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">Stock</p>
                                  <p className="font-semibold">{variant.stock} units</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">Confirmed Sales</p>
                                  <p className="font-semibold">{variantRealSales}</p>
                                </div>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" asChild className="flex-shrink-0">
                              <Link href={`/dashboard/products/${product.id}/edit?variant=${variant.id}`}>
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                  
                  <Card className="border-dashed">
                    <CardContent className="py-6 text-center">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/products/${product.id}/edit?tab=variants`}>
                          <Tag className="h-4 w-4 mr-2" />
                          Add New Variant
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium mb-1">No variants available</p>
                    <p className="text-xs mb-3">Create variants for different sizes, colors, or options</p>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/products/${product.id}/variants`}>
                        <Tag className="h-4 w-4 mr-2" />
                        Add Variant
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Inventory Tab */}
            <TabsContent value="inventory" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Inventory History</CardTitle>
                      <CardDescription className="mt-1">
                        Track all stock changes and adjustments
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {product.inventoryLogs.length} changes
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {product.inventoryLogs.length > 0 ? (
                    <div className="space-y-3">
                      {product.inventoryLogs.map((log) => (
                        <div key={log.id} className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                log.changeAmount > 0 
                                  ? 'bg-green-100 dark:bg-green-900/30' 
                                  : 'bg-red-100 dark:bg-red-900/30'
                              }`}>
                                {log.changeAmount > 0 ? (
                                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium">
                                  {log.changeAmount > 0 ? '+' : ''}{log.changeAmount} units
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  New stock: <span className="font-medium">{log.newStock}</span>
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {log.reason.replace(/_/g, ' ').toLowerCase()}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-2">
                            <Users className="h-3 w-3" />
                            <span>{log.changedByUser.name || log.changedByUser.email}</span>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>
                              {log.createdAt.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })} at {log.createdAt.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          {log.notes && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 p-2 bg-white dark:bg-gray-800 rounded border">
                              {log.notes}
                            </p>
                          )}
                        </div>
                      ))}
                      
                      {product.inventoryLogs.length >= 20 && (
                        <div className="pt-2">
                          <Button variant="outline" className="w-full" size="sm">
                            <History className="h-3 w-3 mr-2" />
                            View Full History
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                      <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium mb-1">No inventory changes recorded</p>
                      <p className="text-xs">Stock changes will appear here once recorded</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}