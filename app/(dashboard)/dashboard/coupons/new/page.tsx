/* eslint-disable @typescript-eslint/no-explicit-any */

// ============================================
// FILE: app/(dashboard)/dashboard/coupons/new/page.tsx - ENHANCED VERSION
// ============================================
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, Save, Percent, DollarSign, Calendar, Target, 
  Sparkles, AlertCircle, CheckCircle, Info, Loader2, Eye, Copy, RefreshCw 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

export default function CreateCouponPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const duplicateId = searchParams.get('duplicate')
  
  const [loading, setLoading] = useState(false)
  const [loadingDuplicate, setLoadingDuplicate] = useState(!!duplicateId)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPreview, setShowPreview] = useState(false)
  
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

  // Load duplicate coupon data
  useEffect(() => {
    if (duplicateId) {
      loadDuplicateData(duplicateId)
    }
  }, [duplicateId])

  const loadDuplicateData = async (id: string) => {
    try {
      setLoadingDuplicate(true)
      const response = await fetch(`/api/admin/coupons/${id}`)
      if (response.ok) {
        const coupon = await response.json()
        setFormData({
          code: `${coupon.code}_COPY`,
          description: coupon.description || '',
          type: coupon.type,
          value: coupon.value.toString(),
          minAmount: coupon.minAmount?.toString() || '',
          maxUses: coupon.maxUses?.toString() || '',
          isActive: coupon.isActive,
          startsAt: '',
          expiresAt: coupon.expiresAt || ''
        })
        toast.success('Coupon data loaded for duplication')
      }
    } catch (error) {
      toast.error('Failed to load coupon data')
    } finally {
      setLoadingDuplicate(false)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        document.getElementById('submit-button')?.click()
      }
      // Ctrl/Cmd + P to toggle preview
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        setShowPreview(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    const newErrors: Record<string, string> = {}
    
    if (!formData.code.trim()) {
      newErrors.code = 'Coupon code is required'
    } else if (!/^[A-Z0-9_-]+$/.test(formData.code)) {
      newErrors.code = 'Code can only contain uppercase letters, numbers, hyphens, and underscores'
    } else if (formData.code.length < 3) {
      newErrors.code = 'Code must be at least 3 characters'
    } else if (formData.code.length > 50) {
      newErrors.code = 'Code must be less than 50 characters'
    }

    if (!formData.value || parseFloat(formData.value) <= 0) {
      newErrors.value = 'Discount value must be greater than 0'
    }

    if (formData.type === 'PERCENTAGE' && parseFloat(formData.value) > 100) {
      newErrors.value = 'Percentage cannot exceed 100%'
    }

    if (formData.minAmount && parseFloat(formData.minAmount) < 0) {
      newErrors.minAmount = 'Minimum amount cannot be negative'
    }

    if (formData.maxUses && parseInt(formData.maxUses) < 1) {
      newErrors.maxUses = 'Maximum uses must be at least 1'
    }

    if (formData.startsAt && formData.expiresAt) {
      if (new Date(formData.startsAt) >= new Date(formData.expiresAt)) {
        newErrors.expiresAt = 'Expiration date must be after start date'
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error('Please fix the validation errors')
      return
    }

    setLoading(true)
    setErrors({})

    try {
      const response = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          value: parseFloat(formData.value),
          minAmount: formData.minAmount ? parseFloat(formData.minAmount) : null,
          maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
          startsAt: formData.startsAt || null,
          expiresAt: formData.expiresAt || null
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Coupon created successfully!')
        router.push('/dashboard/coupons')
      } else {
        if (data.errors) {
          setErrors(data.errors)
        } else {
          toast.error(data.error || 'Failed to create coupon')
        }
      }
    } catch (error) {
      toast.error('Failed to create coupon. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Generate random coupon code
  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    handleChange('code', code)
    toast.success('Random code generated!')
  }

  // Calculate preview values
  const previewCalculation = useMemo(() => {
    const value = parseFloat(formData.value) || 0
    const minAmount = parseFloat(formData.minAmount) || 0
    
    if (formData.type === 'PERCENTAGE') {
      const sampleOrder = minAmount || 100
      const discount = (sampleOrder * value) / 100
      return {
        sampleOrder: sampleOrder,
        discount: discount,
        final: sampleOrder - discount
      }
    } else {
      const sampleOrder = Math.max(minAmount, value) + 50
      return {
        sampleOrder: sampleOrder,
        discount: value,
        final: sampleOrder - value
      }
    }
  }, [formData.type, formData.value, formData.minAmount])

  // Validation suggestions
  const validationSuggestions = useMemo(() => {
    const suggestions: string[] = []
    
    if (!formData.code) {
      suggestions.push('Add a memorable coupon code')
    }
    if (!formData.description) {
      suggestions.push('Add a description to help identify this coupon')
    }
    if (!formData.maxUses) {
      suggestions.push('Consider setting a usage limit')
    }
    if (!formData.expiresAt) {
      suggestions.push('Consider setting an expiration date')
    }
    if (formData.type === 'PERCENTAGE' && parseFloat(formData.value) > 50) {
      suggestions.push('High percentage discounts may impact profits significantly')
    }
    
    return suggestions
  }, [formData])

  if (loadingDuplicate) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-900" />
          <p className="text-slate-600">Loading coupon data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form - Left Side (2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/coupons">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Link>
                </Button>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-7 h-7 text-purple-500" />
                    Create New Coupon
                  </h1>
                  <p className="text-slate-600 mt-1">
                    Set up a discount coupon for your customers
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <kbd className="px-2 py-1 bg-gray-100 border rounded">Ctrl+S</kbd>
                    <span>Save</span>
                    <kbd className="px-2 py-1 bg-gray-100 border rounded">Ctrl+P</kbd>
                    <span>Preview</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Summary */}
            {Object.keys(errors).length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Please fix the following errors:</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    {Object.values(errors).map((error, index) => (
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
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          id="code"
                          placeholder="e.g., SAVE20, WELCOME50"
                          value={formData.code}
                          onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                          required
                          className={`font-mono ${errors.code ? 'border-red-500' : ''}`}
                        />
                        {errors.code && (
                          <p className="text-xs text-red-600 mt-1">{errors.code}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateCode}
                        title="Generate random code"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Use uppercase letters, numbers, hyphens, and underscores only (3-50 characters)
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
                      maxLength={500}
                    />
                    <p className="text-xs text-slate-500">
                      {formData.description.length}/500 characters
                    </p>
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
                      <div className={`flex items-center space-x-2 p-4 border-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer ${
                        formData.type === 'PERCENTAGE' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                      }`}>
                        <RadioGroupItem value="PERCENTAGE" id="percentage" />
                        <Label htmlFor="percentage" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100">
                              <Percent className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">Percentage Discount</p>
                              <p className="text-sm text-slate-500">
                                e.g., 10%, 25%, 50% off
                              </p>
                            </div>
                          </div>
                        </Label>
                      </div>

                      <div className={`flex items-center space-x-2 p-4 border-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer ${
                        formData.type === 'FIXED_AMOUNT' ? 'border-green-500 bg-green-50' : 'border-slate-200'
                      }`}>
                        <RadioGroupItem value="FIXED_AMOUNT" id="fixed" />
                        <Label htmlFor="fixed" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100">
                              <DollarSign className="w-5 h-5 text-green-600" />
                            </div>
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
                          className={`pr-12 ${errors.value ? 'border-red-500' : ''}`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                          {formData.type === 'PERCENTAGE' ? '%' : '$'}
                        </span>
                      </div>
                      {errors.value && (
                        <p className="text-xs text-red-600">{errors.value}</p>
                      )}
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
                          className={`pl-8 ${errors.minAmount ? 'border-red-500' : ''}`}
                        />
                      </div>
                      {errors.minAmount ? (
                        <p className="text-xs text-red-600">{errors.minAmount}</p>
                      ) : (
                        <p className="text-xs text-slate-500">
                          Leave empty for no minimum
                        </p>
                      )}
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
                      className={errors.maxUses ? 'border-red-500' : ''}
                    />
                    {errors.maxUses ? (
                      <p className="text-xs text-red-600">{errors.maxUses}</p>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Leave empty for unlimited uses
                      </p>
                    )}
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
                        className={errors.expiresAt ? 'border-red-500' : ''}
                      />
                      {errors.expiresAt ? (
                        <p className="text-xs text-red-600">{errors.expiresAt}</p>
                      ) : (
                        <p className="text-xs text-slate-500">
                          Leave empty for no expiration
                        </p>
                      )}
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
                      <Label htmlFor="isActive" className="text-base">Active</Label>
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
              <div className="flex items-center justify-between gap-4 pb-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/coupons')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {showPreview ? 'Hide' : 'Show'} Preview
                  </Button>
                  <Button 
                    id="submit-button"
                    type="submit" 
                    disabled={loading}
                    className="min-w-[140px]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Create Coupon
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>

          {/* Preview & Suggestions Sidebar - Right Side (1 column) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Live Preview */}
            {showPreview && formData.code && formData.value && (
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Live Preview
                  </CardTitle>
                  <CardDescription>
                    How this coupon will appear
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Coupon Card Preview */}
                  <div className="p-6 border-2 border-dashed border-slate-300 rounded-lg bg-gradient-to-br from-purple-50 to-blue-50">
                    <div className="text-center space-y-3">
                      <code className="inline-block text-2xl font-bold text-slate-900 bg-white px-4 py-2 rounded-lg shadow-sm">
                        {formData.code}
                      </code>
                      
                      <div className="flex items-center justify-center gap-2">
                        {formData.type === 'PERCENTAGE' ? (
                          <>
                            <Percent className="w-6 h-6 text-blue-600" />
                            <span className="text-3xl font-bold text-blue-900">
                              {formData.value}%
                            </span>
                            <span className="text-lg text-slate-600">OFF</span>
                          </>
                        ) : (
                          <>
                            <DollarSign className="w-6 h-6 text-green-600" />
                            <span className="text-3xl font-bold text-green-900">
                              ${formData.value}
                            </span>
                            <span className="text-lg text-slate-600">OFF</span>
                          </>
                        )}
                      </div>

                      {formData.description && (
                        <p className="text-sm text-slate-600 italic">
                          {formData.description}
                        </p>
                      )}

                      <Separator />

                      <div className="space-y-2 text-xs text-slate-600">
                        {formData.minAmount && (
                          <p>Min. order: <strong>${formData.minAmount}</strong></p>
                        )}
                        {formData.maxUses && (
                          <p>Limited to <strong>{formData.maxUses}</strong> uses</p>
                        )}
                        {formData.expiresAt && (
                          <p>Expires: <strong>{new Date(formData.expiresAt).toLocaleDateString()}</strong></p>
                        )}
                        {!formData.expiresAt && (
                          <Badge variant="outline" className="text-green-600">
                            No expiration
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Example Calculation */}
                  {formData.value && (
                    <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                      <p className="text-sm font-medium text-slate-700">Example Calculation:</p>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Order Total:</span>
                          <span className="font-medium">${previewCalculation.sampleOrder.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-green-600">
                          <span>Discount:</span>
                          <span className="font-medium">-${previewCalculation.discount.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold">
                          <span>Final Total:</span>
                          <span>${previewCalculation.final.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(formData.code)
                      toast.success('Code copied!')
                    }}
                    className="w-full"
                    disabled={!formData.code}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Code
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Suggestions */}
            {validationSuggestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-700">
                    <Info className="w-5 h-5" />
                    Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {validationSuggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <CheckCircle className="w-5 h-5" />
                  Best Practices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Use memorable codes like SAVE20 or WELCOME10</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Set expiration dates to create urgency</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Add minimum order amounts to protect margins</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Limit usage for exclusive promotions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Test coupons before launching campaigns</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            {formData.value && (
              <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
                <CardHeader>
                  <CardTitle className="text-base">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Discount Type</span>
                    <Badge variant={formData.type === 'PERCENTAGE' ? 'default' : 'secondary'}>
                      {formData.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Value</span>
                    <span className="font-medium">
                      {formData.type === 'PERCENTAGE' ? `${formData.value}%` : `${formData.value}`}
                    </span>
                  </div>
                  {formData.minAmount && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Min. Order</span>
                      <span className="font-medium">${formData.minAmount}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Max Uses</span>
                    <span className="font-medium">
                      {formData.maxUses || 'Unlimited'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Status</span>
                    <Badge variant={formData.isActive ? 'default' : 'secondary'}>
                      {formData.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {formData.expiresAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Expires</span>
                      <span className="text-xs font-medium">
                        {new Date(formData.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}