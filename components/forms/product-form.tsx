/* eslint-disable @typescript-eslint/no-explicit-any */
// components/forms/product-form.tsx - UPDATED WITH HIERARCHICAL SELECTOR
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Upload, 
  X, 
  Plus,
  Tag,
  Package,
  DollarSign,
  Image as ImageIcon,
  Link as LinkIcon,
  FileImage,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import HierarchicalCategorySelector from '../HierarchicalCategorySelector'

const productSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().min(0.01, 'Price must be greater than 0'),
  comparePrice: z.number().optional().nullable(),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  sku: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  brandId: z.string().optional().nullable(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
})

interface Category {
  id: string
  name: string
  slug: string
  parentId: string | null
}

interface Brand {
  id: string
  name: string
  slug: string
  logo: string | null
}

interface ProductFormProps {
  initialData?: any
  categories: Category[]
  brands: Brand[]
}

export function ProductForm({ initialData, categories, brands }: ProductFormProps) {
  const router = useRouter()
  const isEditMode = !!initialData
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [images, setImages] = useState<string[]>(initialData?.images || [])
  const [imageUrl, setImageUrl] = useState('')
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [currentTag, setCurrentTag] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // ✅ Track if category was changed
  const [categoryChanged, setCategoryChanged] = useState(false)
  const originalCategoryId = initialData?.categoryId || null

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      price: initialData?.price || 0,
      comparePrice: initialData?.comparePrice || null,
      stock: initialData?.stock || 0,
      sku: initialData?.sku || null,
      categoryId: initialData?.categoryId || null,
      brandId: initialData?.brandId || null,
      isActive: initialData?.isActive ?? true,
      isFeatured: initialData?.isFeatured ?? false,
    },
  })

  const isActive = watch('isActive')
  const isFeatured = watch('isFeatured')
  const categoryId = watch('categoryId')
  const brandId = watch('brandId')

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const uploadedUrls: string[] = []
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`)
          continue
        }

        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Maximum 10MB allowed.`)
          continue
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('alt', `Product image for ${watch('name') || 'product'}`)

        const response = await fetch('/api/upload?type=product&optimize=true&quality=85', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to upload image')
        }

        const result = await response.json()
        uploadedUrls.push(result.url)
        
        setUploadProgress(((i + 1) / files.length) * 100)
      }

      if (uploadedUrls.length > 0) {
        setImages([...images, ...uploadedUrls])
        toast.success(`${uploadedUrls.length} image(s) uploaded successfully`)
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

    } catch (error: any) {
      console.error('Error uploading files:', error)
      toast.error(error.message || 'Failed to upload images')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleAddImageUrl = () => {
    if (imageUrl.trim() && !images.includes(imageUrl.trim())) {
      try {
        new URL(imageUrl.trim())
        setImages([...images, imageUrl.trim()])
        setImageUrl('')
        toast.success('Image URL added')
      } catch {
        toast.error('Please enter a valid URL')
      }
    }
  }

  const handleRemoveImage = async (index: number, url: string) => {
    if (url.startsWith('/uploads/')) {
      try {
        await fetch(`/api/upload?url=${encodeURIComponent(url)}`, {
          method: 'DELETE',
        })
      } catch (error) {
        console.error('Failed to delete file:', error)
      }
    }
    
    setImages(images.filter((_, i) => i !== index))
    toast.success('Image removed')
  }

  const handleAddTag = () => {
    const trimmedTag = currentTag.trim().toLowerCase()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag])
      setCurrentTag('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  // ✅ Handle category change tracking
  const handleCategoryChange = (newCategoryId: string | null) => {
    setValue('categoryId', newCategoryId)
    
    // Only track as changed if in edit mode and different from original
    if (isEditMode && newCategoryId !== originalCategoryId) {
      setCategoryChanged(true)
    } else {
      setCategoryChanged(false)
    }
  }

  const onSubmit = async (data: z.infer<typeof productSchema>) => {
    try {
      setIsSubmitting(true)

      if (images.length === 0) {
        toast.error('Please add at least one product image')
        return
      }

      const slug = data.name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')

      const payload = {
        ...data,
        slug,
        images,
        tags,
        categoryId: data.categoryId || null,
        brandId: data.brandId || null,
        sku: data.sku || null,
        comparePrice: data.comparePrice || null,
      }

      const url = isEditMode 
        ? `/api/products/${initialData.id}` 
        : '/api/products'
      
      const method = isEditMode ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save product')
      }

      const result = await response.json()
      
      toast.success(
        isEditMode 
          ? 'Product updated successfully' 
          : 'Product created successfully'
      )
      
      // Reset category changed flag
      setCategoryChanged(false)
      
      router.push(`/dashboard/products/${result.id}`)
      router.refresh()
    } catch (error: any) {
      console.error('Error saving product:', error)
      toast.error(error.message || 'Failed to save product')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditMode ? 'Edit Product' : 'Create Product'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditMode ? 'Update product information' : 'Add a new product to your store'}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/products">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Essential product details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="e.g., Premium Cotton T-Shirt"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Detailed product description..."
                    rows={4}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-500">{errors.description.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      {...register('sku')}
                      placeholder="e.g., PROD-001"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock Quantity *</Label>
                    <Input
                      id="stock"
                      type="number"
                      {...register('stock', { valueAsNumber: true })}
                      placeholder="0"
                    />
                    {errors.stock && (
                      <p className="text-sm text-red-500">{errors.stock.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price * ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      {...register('price', { valueAsNumber: true })}
                      placeholder="0.00"
                    />
                    {errors.price && (
                      <p className="text-sm text-red-500">{errors.price.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="comparePrice">Compare Price ($)</Label>
                    <Input
                      id="comparePrice"
                      type="number"
                      step="0.01"
                      {...register('comparePrice', { 
                        setValueAs: (v) => v === '' ? null : parseFloat(v)
                      })}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground">
                      Show as strikethrough
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Images */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Product Images
                </CardTitle>
                <CardDescription>
                  Upload images or add via URL (first image will be the main image)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="upload" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">
                      <FileImage className="h-4 w-4 mr-2" />
                      Upload Files
                    </TabsTrigger>
                    <TabsTrigger value="url">
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Add URL
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="upload" className="space-y-4">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                        <span className="text-sm font-medium">
                          Click to upload or drag and drop
                        </span>
                        <span className="text-xs text-muted-foreground mt-1">
                          PNG, JPG, WebP, GIF up to 10MB
                        </span>
                      </label>
                    </div>
                    
                    {isUploading && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Uploading...</span>
                          <span>{uploadProgress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="url" className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddImageUrl())}
                      />
                      <Button
                        type="button"
                        onClick={handleAddImageUrl}
                        variant="outline"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter a direct URL to an image hosted elsewhere
                    </p>
                  </TabsContent>
                </Tabs>

                {images.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                    {images.map((img, index) => (
                      <div
                        key={index}
                        className="relative group aspect-square rounded-lg overflow-hidden border-2 border-muted hover:border-primary transition-colors"
                      >
                        <Image
                          src={img}
                          alt={`Product ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        {index === 0 && (
                          <Badge className="absolute top-2 left-2 text-xs">
                            Main
                          </Badge>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index, img)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {images.length === 0 && (
                  <div className="border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No images added yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Product Tags
                </CardTitle>
                <CardDescription>
                  Add tags for better searchability
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    placeholder="Enter tag..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <Button
                    type="button"
                    onClick={handleAddTag}
                    variant="outline"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-red-600"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="isActive">Active</Label>
                    <p className="text-xs text-muted-foreground">
                      Visible to customers
                    </p>
                  </div>
                  <Switch
                    id="isActive"
                    checked={isActive}
                    onCheckedChange={(checked) => setValue('isActive', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="isFeatured">Featured</Label>
                    <p className="text-xs text-muted-foreground">
                      Show on homepage
                    </p>
                  </div>
                  <Switch
                    id="isFeatured"
                    checked={isFeatured}
                    onCheckedChange={(checked) => setValue('isFeatured', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Organization */}
            <Card>
              <CardHeader>
                <CardTitle>Organization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* ✅ NEW: Hierarchical Category Selector */}
                <div className="space-y-2">
                  <Label htmlFor="categoryId">Category</Label>
                  <HierarchicalCategorySelector
                    categories={categories}
                    value={categoryId || null}
                    onValueChange={handleCategoryChange}
                  />
                  
                  {/* ✅ Show warning if category changed */}
                  {categoryChanged && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-amber-800">
                        Category will be updated when you save the product
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brandId">Brand</Label>
                  <Select
                    value={brandId || 'none'}
                    onValueChange={(value: string | null | undefined) => setValue('brandId', value === 'none' ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No brand</SelectItem>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {isEditMode ? 'Update Product' : 'Create Product'}
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/dashboard/products')}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}