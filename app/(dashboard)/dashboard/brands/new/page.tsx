/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(dashboard)/dashboard/brands/new/page.tsx OR [id]/edit/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  ArrowLeft, Save, Building2, Globe, FileText,
  Image as ImageIcon, CheckCircle, AlertCircle, Upload
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

interface BrandFormProps {
  params?: { id: string }
  mode?: 'create' | 'edit'
}

export default function BrandForm({ params, mode = 'create' }: BrandFormProps) {
  const router = useRouter()
  const isEdit = mode === 'edit' && params?.id
  
  // Form state
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logo: '',
    description: '',
    website: '',
    isActive: true
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  // Fetch brand data if editing
  useEffect(() => {
    if (isEdit) {
      fetchBrand()
    }
  }, [isEdit, params?.id])

  const fetchBrand = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/brands/${params?.id}`)
      
      if (!response.ok) throw new Error('Failed to fetch brand')
      
      const data = await response.json()
      setFormData({
        name: data.name || '',
        slug: data.slug || '',
        logo: data.logo || '',
        description: data.description || '',
        website: data.website || '',
        isActive: data.isActive ?? true
      })
      setSlugManuallyEdited(true)
    } catch (error) {
      console.error('Error fetching brand:', error)
      toast.error('Failed to load brand')
      router.push('/dashboard/brands')
    } finally {
      setLoading(false)
    }
  }

  // Auto-generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  // Handle name change
  const handleNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      name: value,
      slug: slugManuallyEdited ? prev.slug : generateSlug(value)
    }))
    if (errors.name) setErrors(prev => ({ ...prev, name: '' }))
  }

  // Handle slug change
  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true)
    setFormData(prev => ({ ...prev, slug: value }))
    if (errors.slug) setErrors(prev => ({ ...prev, slug: '' }))
  }

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Brand name is required'
    } else if (formData.name.length < 2) {
      newErrors.name = 'Brand name must be at least 2 characters'
    } else if (formData.name.length > 100) {
      newErrors.name = 'Brand name must not exceed 100 characters'
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required'
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens'
    }

    if (formData.website && formData.website.trim()) {
      try {
        new URL(formData.website)
      } catch {
        newErrors.website = 'Please enter a valid URL (e.g., https://example.com)'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting')
      return
    }

    try {
      setSubmitting(true)
      
      const url = isEdit ? `/api/brands/${params?.id}` : '/api/brands'
      const method = isEdit ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          logo: formData.logo.trim() || null,
          description: formData.description.trim() || null,
          website: formData.website.trim() || null,
          isActive: formData.isActive
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save brand')
      }
      
      const data = await response.json()
      
      toast.success(
        isEdit ? 'Brand updated successfully' : 'Brand created successfully'
      )
      
      router.push(`/dashboard/brands/${data.id}`)
    } catch (error) {
      console.error('Error saving brand:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save brand')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-600">Loading brand...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/brands">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {isEdit ? 'Edit Brand' : 'Create New Brand'}
            </h1>
            <p className="text-slate-600 text-sm">
              {isEdit ? 'Update brand information' : 'Add a new brand to your store'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-600" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Enter the core details about this brand
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Brand Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Brand Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Apple, Samsung, Nike"
                  maxLength={100}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.name}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  {formData.name.length}/100 characters
                </p>
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <Label htmlFor="slug">
                  Slug <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="brand-slug"
                  className={errors.slug ? 'border-red-500' : ''}
                />
                {errors.slug && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.slug}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  URL-friendly identifier (lowercase, hyphens only)
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description about the brand..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-slate-500">
                  {formData.description.length}/500 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Media & Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-slate-600" />
                Media & Links
              </CardTitle>
              <CardDescription>
                Add logo and website information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo URL */}
              <div className="space-y-2">
                <Label htmlFor="logo">Logo URL</Label>
                <Input
                  id="logo"
                  type="url"
                  value={formData.logo}
                  onChange={(e) => setFormData(prev => ({ ...prev, logo: e.target.value }))}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-slate-500">
                  Enter the URL of the brand logo image
                </p>
                
                {/* Logo Preview */}
                {formData.logo && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-slate-700 mb-2">Preview:</p>
                    <div className="w-32 h-32 bg-slate-100 rounded-lg overflow-hidden border-2 border-slate-200 flex items-center justify-center">
                      <Image
                        src={formData.logo}
                        alt="Brand logo preview"
                        width={128}
                        height={128}
                        className="w-full h-full object-contain p-2"
                        onError={() => {
                          toast.error('Failed to load logo image')
                          setFormData(prev => ({ ...prev, logo: '' }))
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="website">
                  Website
                </Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, website: e.target.value }))
                      if (errors.website) setErrors(prev => ({ ...prev, website: '' }))
                    }}
                    placeholder="https://www.brandwebsite.com"
                    className={`pl-10 ${errors.website ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.website && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.website}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Official brand website URL (optional)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-slate-600" />
                Settings
              </CardTitle>
              <CardDescription>
                Configure brand visibility and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="isActive" className="text-base">
                    Active Status
                  </Label>
                  <p className="text-sm text-slate-500">
                    Make this brand visible and available in the store
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, isActive: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Status Alert */}
          {Object.keys(errors).length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please fix the errors above before submitting
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/brands')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="min-w-[120px]"
            >
              {submitting ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEdit ? 'Update Brand' : 'Create Brand'}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Help Section */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-blue-900">Tips for creating brands</p>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>Use the official brand name for consistency</li>
                  <li>Upload high-quality logo images for better appearance</li>
                  <li>Include the brand website to build trust with customers</li>
                  <li>Write a brief description to help customers learn about the brand</li>
                  <li>Keep the slug simple and memorable for clean URLs</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// For create page: app/(dashboard)/dashboard/brands/new/page.tsx
export function CreateBrandPage() {
  return <BrandForm mode="create" />
}

// For edit page: app/(dashboard)/dashboard/brands/[id]/edit/page.tsx
export function EditBrandPage({ params }: { params: { id: string } }) {
  return <BrandForm params={params} mode="edit" />
}