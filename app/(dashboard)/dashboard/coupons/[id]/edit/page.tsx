/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================
// FILE: app/(dashboard)/dashboard/coupons/[id]/edit/page.tsx
// ============================================
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Percent, DollarSign, Calendar, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function EditCouponPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    type: 'PERCENTAGE',
    value: '',
    minAmount: '',
    maxUses: '',
    isActive: true,
    startsAt: '',
    expiresAt: ''
  })

  useEffect(() => {
    fetchCoupon()
  }, [params.id])

  const fetchCoupon = async () => {
    try {
      const response = await fetch(`/api/admin/coupons/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        const coupon = data.coupon
        
        setFormData({
          code: coupon.code,
          description: coupon.description || '',
          type: coupon.type,
          value: coupon.value.toString(),
          minAmount: coupon.minAmount?.toString() || '',
          maxUses: coupon.maxUses?.toString() || '',
          isActive: coupon.isActive,
          startsAt: coupon.startsAt ? new Date(coupon.startsAt).toISOString().slice(0, 16) : '',
          expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 16) : ''
        })
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrors([])

    try {
      const response = await fetch(`/api/admin/coupons/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        router.push(`/dashboard/coupons/${params.id}`)
      } else {
        setErrors(data.errors || [data.error])
      }
    } catch (error) {
      setErrors(['Failed to update coupon. Please try again.'])
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/coupons/${params.id}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Edit Coupon
            </h1>
            <p className="text-slate-600 mt-1">
              Update coupon details and settings
            </p>
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Enter the coupon code and description
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">
                  Coupon Code <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="code"
                  placeholder="e.g., SAVE20, WELCOME50"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                  required
                  className="font-mono"
                />
                <p className="text-xs text-slate-500">
                  Use uppercase letters, numbers, hyphens, and underscores only
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this coupon..."
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Discount Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Discount Configuration</CardTitle>
              <CardDescription>
                Set the discount type and value
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Discount Type <span className="text-red-500">*</span></Label>
                <RadioGroup
                  value={formData.type}
                  onValueChange={(value) => handleChange('type', value)}
                >
                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                    <RadioGroupItem value="PERCENTAGE" id="percentage" />
                    <Label htmlFor="percentage" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Percent className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium">Percentage Discount</p>
                          <p className="text-sm text-slate-500">
                            e.g., 10%, 25%, 50% off
                          </p>
                        </div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                    <RadioGroupItem value="FIXED_AMOUNT" id="fixed" />
                    <Label htmlFor="fixed" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium">Fixed Amount</p>
                          <p className="text-sm text-slate-500">
                            e.g., $10, $25, $50 off
                          </p>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">
                    Discount Value <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="value"
                      type="number"
                      step="0.01"
                      min="0"
                      max={formData.type === 'PERCENTAGE' ? '100' : undefined}
                      placeholder={formData.type === 'PERCENTAGE' ? '10' : '10.00'}
                      value={formData.value}
                      onChange={(e) => handleChange('value', e.target.value)}
                      required
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                      {formData.type === 'PERCENTAGE' ? '%' : '$'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minAmount">
                    Minimum Order Amount
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      $
                    </span>
                    <Input
                      id="minAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.minAmount}
                      onChange={(e) => handleChange('minAmount', e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Leave empty for no minimum
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Usage Limits
              </CardTitle>
              <CardDescription>
                Control how many times this coupon can be used
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="maxUses">Maximum Uses</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min="1"
                  placeholder="Unlimited"
                  value={formData.maxUses}
                  onChange={(e) => handleChange('maxUses', e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Leave empty for unlimited uses
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Schedule
              </CardTitle>
              <CardDescription>
                Set when this coupon becomes active and expires
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startsAt">Start Date & Time</Label>
                  <Input
                    id="startsAt"
                    type="datetime-local"
                    value={formData.startsAt}
                    onChange={(e) => handleChange('startsAt', e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Leave empty to start immediately
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Expiration Date & Time</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => handleChange('expiresAt', e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Leave empty for no expiration
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isActive">Active</Label>
                  <p className="text-sm text-slate-500 mt-1">
                    Enable this coupon for customers to use
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleChange('isActive', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/dashboard/coupons/${params.id}`)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}