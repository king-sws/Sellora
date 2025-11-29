/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================
// FILE: app/(dashboard)/dashboard/coupons/[id]/page.tsx (COMPLETE)
// ============================================
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, Edit2, Trash2, Copy, CheckCircle, 
  TrendingUp, Users, DollarSign, Calendar, Package,
  AlertCircle, Clock, Percent, Target
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatPrice, formatDate } from '@/lib/utils'

export default function CouponDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [coupon, setCoupon] = useState<any>(null)
  const [usage, setUsage] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchCouponDetails()
  }, [params.id])

  const fetchCouponDetails = async () => {
    try {
      const response = await fetch(`/api/admin/coupons/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setCoupon(data.coupon)
        setUsage(data.usage)
      } else {
        router.push('/dashboard/coupons')
      }
    } catch (error) {
      console.error('Error fetching coupon:', error)
      router.push('/dashboard/coupons')
    } finally {
      setLoading(false)
    }
  }

  const deleteCoupon = async () => {
    if (!confirm('Are you sure you want to delete this coupon? This action cannot be undone.')) return

    try {
      const response = await fetch(`/api/admin/coupons/${params.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/dashboard/coupons')
      }
    } catch (error) {
      console.error('Error deleting coupon:', error)
    }
  }

  const toggleStatus = async () => {
    try {
      const response = await fetch(`/api/admin/coupons/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !coupon.isActive })
      })

      if (response.ok) {
        fetchCouponDetails()
      }
    } catch (error) {
      console.error('Error updating coupon:', error)
    }
  }

  const copyCouponCode = () => {
    if (coupon) {
      navigator.clipboard.writeText(coupon.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getCouponStatus = () => {
    if (!coupon) return null
    const now = new Date()
    const expiresAt = coupon.expiresAt ? new Date(coupon.expiresAt) : null
    const startsAt = coupon.startsAt ? new Date(coupon.startsAt) : null

    if (!coupon.isActive) return { label: 'Inactive', color: 'bg-slate-100 text-slate-700', icon: AlertCircle }
    if (startsAt && startsAt > now) return { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', icon: Clock }
    if (expiresAt && expiresAt < now) return { label: 'Expired', color: 'bg-red-100 text-red-700', icon: AlertCircle }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return { label: 'Maxed Out', color: 'bg-orange-100 text-orange-700', icon: Target }
    return { label: 'Active', color: 'bg-green-100 text-green-700', icon: CheckCircle }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  if (!coupon) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-900 mb-2">Coupon not found</p>
            <p className="text-slate-600 mb-6">This coupon may have been deleted or doesn&#39;t exist</p>
            <Button asChild>
              <Link href="/dashboard/coupons">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Coupons
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const status = getCouponStatus()
  const StatusIcon = status?.icon || CheckCircle

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="sm" asChild className="mt-1">
              <Link href="/dashboard/coupons">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
                  {coupon.code}
                </h1>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyCouponCode}
                  className="h-8"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Code
                    </>
                  )}
                </Button>
                {status && (
                  <Badge className={status.color}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                )}
              </div>
              {coupon.description && (
                <p className="text-slate-600">{coupon.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={toggleStatus}
              className={coupon.isActive ? '' : 'border-green-600 text-green-600 hover:bg-green-50'}
            >
              {coupon.isActive ? (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Deactivate
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Activate
                </>
              )}
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/dashboard/coupons/${coupon.id}/edit`}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Link>
            </Button>
            <Button variant="destructive" onClick={deleteCoupon}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Expiration Warning */}
        {coupon.expiresAt && new Date(coupon.expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && new Date(coupon.expiresAt) > new Date() && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              This coupon will expire on <strong>{formatDate(coupon.expiresAt, "")}</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Uses</p>
                  <p className="text-2xl font-bold text-slate-900">{usage.totalOrders}</p>
                  {coupon.maxUses && (
                    <p className="text-xs text-slate-500 mt-1">of {coupon.maxUses} limit</p>
                  )}
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">{formatPrice(usage.totalRevenue)}</p>
                  <p className="text-xs text-slate-500 mt-1">from orders</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Discount</p>
                  <p className="text-2xl font-bold text-purple-600">{formatPrice(usage.totalDiscount)}</p>
                  <p className="text-xs text-slate-500 mt-1">given to customers</p>
                </div>
                <Package className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Avg. Order Value</p>
                  <p className="text-2xl font-bold text-orange-600">{formatPrice(usage.averageOrderValue)}</p>
                  <p className="text-xs text-slate-500 mt-1">per transaction</p>
                </div>
                <Users className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coupon Details & Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coupon Details */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Coupon Details</CardTitle>
              <CardDescription>Configuration and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                <p className="text-sm text-slate-600 mb-2">Discount Value</p>
                <div className="flex items-center gap-2">
                  {coupon.type === 'PERCENTAGE' ? (
                    <>
                      <Percent className="w-6 h-6 text-blue-600" />
                      <span className="text-3xl font-bold text-blue-900">{coupon.value}%</span>
                      <span className="text-sm text-slate-600 ml-auto">OFF</span>
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-6 h-6 text-green-600" />
                      <span className="text-3xl font-bold text-green-900">{formatPrice(coupon.value)}</span>
                      <span className="text-sm text-slate-600 ml-auto">OFF</span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-slate-600">Type</span>
                  <Badge variant="outline">
                    {coupon.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}
                  </Badge>
                </div>

                {coupon.minAmount && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-slate-600">Min. Order</span>
                    <span className="font-medium text-slate-900">{formatPrice(coupon.minAmount)}</span>
                  </div>
                )}

                <div className="py-2 border-b">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">Usage</span>
                    <span className="font-medium text-slate-900">
                      {coupon.usedCount} {coupon.maxUses ? `/ ${coupon.maxUses}` : ''}
                    </span>
                  </div>
                  {coupon.maxUses && (
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          (coupon.usedCount / coupon.maxUses) * 100 >= 90 ? 'bg-red-500' :
                          (coupon.usedCount / coupon.maxUses) * 100 >= 70 ? 'bg-amber-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((coupon.usedCount / coupon.maxUses) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                  {!coupon.maxUses && (
                    <p className="text-xs text-slate-500">Unlimited uses</p>
                  )}
                </div>

                {coupon.startsAt && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-slate-600">Starts</span>
                    <span className="text-sm font-medium text-slate-900">{formatDate(coupon.startsAt, "")}</span>
                  </div>
                )}

                {coupon.expiresAt && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-slate-600">Expires</span>
                    <span className="text-sm font-medium text-slate-900">{formatDate(coupon.expiresAt, "")}</span>
                  </div>
                )}

                {!coupon.expiresAt && (
                  <div className="flex items-center gap-2 py-2 border-b">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600 font-medium">No expiration date</span>
                  </div>
                )}

                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-slate-600">Status</span>
                  <Badge variant={coupon.isActive ? 'default' : 'secondary'}>
                    {coupon.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-600">Created</span>
                  <span className="text-sm font-medium text-slate-900">{formatDate(coupon.createdAt, "")}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>
                {usage.totalOrders > 0 
                  ? `Showing ${Math.min(usage.orders.length, 50)} of ${usage.totalOrders} order${usage.totalOrders !== 1 ? 's' : ''}`
                  : 'No orders yet with this coupon'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usage.orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    No orders yet
                  </h3>
                  <p className="text-slate-600 max-w-sm mx-auto">
                    This coupon hasn&#39;t been used yet. Share the code <strong className="font-mono">{coupon.code}</strong> with your customers to start seeing orders.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {usage.orders.map((order: any) => (
                    <div 
                      key={order.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="border-2 border-slate-200">
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${order.user.name || order.user.email}`} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                            {(order.user.name || order.user.email)?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">
                            {order.user.name || 'Guest Customer'}
                          </p>
                          <p className="text-sm text-slate-500 truncate">
                            {order.user.email}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-400">
                              #{order.orderNumber}
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-400">
                              {formatDate(order.createdAt, 'short')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-slate-900">
                          {formatPrice(order.total)}
                        </p>
                        <p className="text-sm text-green-600 font-medium">
                          -{formatPrice(order.discount)} saved
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}