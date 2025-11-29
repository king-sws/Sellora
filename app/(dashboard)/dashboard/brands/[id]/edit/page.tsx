/* eslint-disable react/no-unescaped-entities */
// app/(dashboard)/dashboard/brands/[id]/edit/page.tsx
'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { 
  ArrowLeft, Save, Loader2, Building2, Globe, 
  ImageIcon, Trash2, Eye, EyeOff, AlertCircle, Upload, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'


interface Brand {
  id: string
  name: string
  slug: string
  logo: string | null
  description: string | null
  website: string | null
  isActive: boolean
  _count: {
    products: number
  }
  createdAt: string
  updatedAt: string
}

interface BrandEditPageProps {
  params: Promise<{ id: string }>
}

export default function BrandEditPage({ params }: BrandEditPageProps) {

  const { id } = use(params)

  const router = useRouter()
  const [brand, setBrand] = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploadProgress, setUploadProgress] = useState<string>('')
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logo: '',
    description: '',
    website: '',
    isActive: true
  })

  // Previous logo for deletion
  const [previousLogo, setPreviousLogo] = useState<string>('')

  const fetchBrand = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/brands/${id}`)
      
      if (!response.ok) {
        throw new Error('Brand not found')
      }
      
      const data = await response.json()
      setBrand(data)
      setFormData({
        name: data.name,
        slug: data.slug,
        logo: data.logo || '',
        description: data.description || '',
        website: data.website || '',
        isActive: data.isActive
      })
      setPreviousLogo(data.logo || '')
    } catch (error) {
      console.error('Error fetching brand:', error)
      toast.error('Failed to load brand')
      router.push('/dashboard/brands')
    } finally {
      setLoading(false)
    }
  }, [id, router]) // Add dependencies

  useEffect(() => {
    fetchBrand()
  }, [fetchBrand])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
    
    setFormData(prev => ({ ...prev, slug }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload JPEG, PNG, WebP, or GIF.')
      return
    }

    // Validate file size (2MB for brand logos)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      toast.error('File size too large. Maximum 2MB allowed for brand logos.')
      return
    }

    try {
      setUploading(true)
      setUploadProgress('Uploading...')

      // Create form data
      const formData = new FormData()
      formData.append('file', file)
      formData.append('alt', `${brand?.name || 'Brand'} logo`)

      // Upload with query parameters
      const response = await fetch('/api/upload?type=brand&optimize=true&quality=85', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      // Delete previous logo if it exists and was uploaded (not external URL)
      if (previousLogo && previousLogo.startsWith('/uploads/')) {
        try {
          await fetch(`/api/upload?url=${encodeURIComponent(previousLogo)}`, {
            method: 'DELETE'
          })
        } catch (error) {
          console.error('Error deleting old logo:', error)
          // Don't throw - continue with upload success
        }
      }

      // Update form with new logo URL
      setFormData(prev => ({ ...prev, logo: data.url }))
      setPreviousLogo(data.url)
      
      // Clear any logo errors
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.logo
        return newErrors
      })

      toast.success(
        `Image uploaded successfully! ${data.compressionRatio} size reduction.`
      )

    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setUploading(false)
      setUploadProgress('')
      // Reset file input
      e.target.value = ''
    }
  }

  const handleRemoveLogo = async () => {
    if (!formData.logo) return

    // If it's an uploaded file, delete it from server
    if (formData.logo.startsWith('/uploads/')) {
      try {
        const response = await fetch(`/api/upload?url=${encodeURIComponent(formData.logo)}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to delete image')
        }

        toast.success('Logo removed successfully')
      } catch (error) {
        console.error('Error deleting logo:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to remove logo')
        return
      }
    }

    // Clear logo from form
    setFormData(prev => ({ ...prev, logo: '' }))
    setPreviousLogo('')
  }

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
      newErrors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens'
    }

    if (formData.website && formData.website.trim()) {
      try {
        new URL(formData.website)
      } catch {
        newErrors.website = 'Please enter a valid URL (e.g., https://example.com)'
      }
    }

    if (formData.logo && formData.logo.trim() && !formData.logo.startsWith('/uploads/')) {
      try {
        new URL(formData.logo)
      } catch {
        newErrors.logo = 'Please enter a valid image URL'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please fix the errors before saving')
      return
    }

    try {
      setSaving(true)
      
      const response = await fetch(`/api/brands/${id}`, {
        method: 'PUT',
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

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update brand')
      }

      toast.success('Brand updated successfully!')
      router.push('/dashboard/brands')
      router.refresh()
    } catch (error) {
      console.error('Error updating brand:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update brand')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!brand) return

    if (brand._count.products > 0) {
      toast.error(`Cannot delete brand with ${brand._count.products} products`)
      return
    }

    if (!confirm(`Are you sure you want to delete "${brand.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      // Delete logo if it's an uploaded file
      if (formData.logo && formData.logo.startsWith('/uploads/')) {
        try {
          await fetch(`/api/upload?url=${encodeURIComponent(formData.logo)}`, {
            method: 'DELETE'
          })
        } catch (error) {
          console.error('Error deleting logo:', error)
          // Continue with brand deletion
        }
      }

      const response = await fetch(`/api/brands/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete brand')
      }

      toast.success('Brand deleted successfully')
      router.push('/dashboard/brands')
      router.refresh()
    } catch (error) {
      console.error('Error deleting brand:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete brand')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50">
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Building2 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Brand not found</h2>
            <p className="text-slate-600 mb-4">The brand you're looking for doesn't exist.</p>
            <Button asChild>
              <Link href="/dashboard/brands">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Brands
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/brands">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-7 h-7 text-blue-600" />
                Edit Brand
              </h1>
              <p className="text-slate-600 text-sm mt-1">
                Update brand information and settings
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={brand.isActive ? "default" : "secondary"}>
              {brand.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant="outline">
              {brand._count.products} products
            </Badge>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Essential details about the brand
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Brand Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Apple, Samsung, Sony"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="slug">
                    Slug <span className="text-red-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateSlug}
                  >
                    Generate from name
                  </Button>
                </div>
                <Input
                  id="slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  placeholder="brand-slug"
                  className={errors.slug ? 'border-red-500' : ''}
                />
                {errors.slug && (
                  <p className="text-sm text-red-600">{errors.slug}</p>
                )}
                <p className="text-xs text-slate-500">
                  URL: /brands/{formData.slug || 'brand-slug'}
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Brief description of the brand..."
                  rows={4}
                />
                <p className="text-xs text-slate-500">
                  {formData.description.length} / 500 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Media */}
          <Card>
            <CardHeader>
              <CardTitle>Brand Logo</CardTitle>
              <CardDescription>
                Upload a logo or provide an external URL
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Section */}
              <div className="space-y-2">
                <Label>Upload Logo</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="cursor-pointer"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={uploading}
                    onClick={() => document.getElementById('logo-upload')?.click()}
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
                {uploading && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{uploadProgress}</span>
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  Max 2MB. Accepts JPEG, PNG, WebP, GIF. Images will be optimized automatically.
                </p>
              </div>

              {/* OR Divider */}
              

              {/* Logo Preview */}
              {formData.logo ? (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="relative w-40 h-40 bg-slate-100 rounded-lg border-2 border-slate-200 overflow-hidden flex items-center justify-center group">
                    <Image
                      src={formData.logo}
                      alt="Brand logo preview"
                      width={160}
                      height={160}
                      className="w-full h-full object-contain p-4"
                      onError={() => {
                        setErrors(prev => ({ 
                          ...prev, 
                          logo: 'Failed to load image. Please check the URL.' 
                        }))
                      }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={handleRemoveLogo}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {formData.logo.startsWith('/uploads/') && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Upload className="w-3 h-3" />
                      Uploaded image
                    </p>
                  )}
                </div>
              ) : (
                <div className="w-40 h-40 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center">
                  <div className="text-center">
                    <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">No logo</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Website & Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Website & Settings</CardTitle>
              <CardDescription>
                Additional brand information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="website">
                  <Globe className="w-4 h-4 inline mr-2" />
                  Website URL
                </Label>
                <Input
                  id="website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://www.brand.com"
                  className={errors.website ? 'border-red-500' : ''}
                />
                {errors.website && (
                  <p className="text-sm text-red-600">{errors.website}</p>
                )}
              </div>

              {/* Active Status */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  {formData.isActive ? (
                    <Eye className="w-5 h-5 text-green-600" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-slate-400" />
                  )}
                  <div>
                    <Label htmlFor="isActive" className="cursor-pointer">
                      Active Status
                    </Label>
                    <p className="text-sm text-slate-600">
                      {formData.isActive 
                        ? 'Brand is visible and searchable' 
                        : 'Brand is hidden from customers'
                      }
                    </p>
                  </div>
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

          {/* Metadata */}
          <Card className="border-slate-200 bg-slate-50/50">
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Created:</span>
                <span className="font-medium text-slate-900">
                  {formatDate(brand.createdAt, 'long')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Last Updated:</span>
                <span className="font-medium text-slate-900">
                  {formatDate(brand.updatedAt, 'long')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Products:</span>
                <span className="font-medium text-slate-900">{brand._count.products}</span>
              </div>
            </CardContent>
          </Card>

          {/* Delete Warning */}
          {brand._count.products > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 mb-1">Cannot delete brand</p>
                    <p className="text-sm text-amber-700">
                      This brand has {brand._count.products} associated product{brand._count.products !== 1 ? 's' : ''}. 
                      Please reassign or delete all products before deleting this brand.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-4 pt-6 border-t border-slate-200">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={saving || uploading || brand._count.products > 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Brand
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/brands')}
                disabled={saving || uploading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || uploading}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
          </div>
        </form>
      </div>
    </div>
  )
}