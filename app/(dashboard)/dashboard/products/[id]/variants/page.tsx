/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(dashboard)/products/[id]/variants/page.tsx
// Enhanced with better UX, stats cards, and insights
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Plus, Edit, Trash2, ArrowLeft, Package, AlertCircle, Layers, 
  ShoppingCart, DollarSign, TrendingUp, Eye, Search, Filter,
  CheckCircle2, XCircle, RefreshCw, Download, Copy, Tag,
  AlertTriangle, Archive
} from 'lucide-react'
import { toast } from 'sonner'
import { Upload, X, Image as ImageIcon } from 'lucide-react' // ADD THESE


interface ProductVariant {
  id: string
  productId: string
  sku: string
  name: string
  price: number | null
  comparePrice: number | null
  stock: number
  attributes: Record<string, string>
  images: string[]
  isActive: boolean
  _count: {
    orderItems: number
    cartItems: number
  }
  createdAt: string
  updatedAt: string
}

interface VariantFormData {
  sku: string
  name: string
  price: string
  comparePrice: string
  stock: string
  attributes: Record<string, string>
  images: string[]
  isActive: boolean
  inventoryNotes: string
}

interface Statistics {
  total: number
  active: number
  totalStock: number
  lowStock: number
  outOfStock: number
}

export default function ProductVariantsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [filteredVariants, setFilteredVariants] = useState<ProductVariant[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null)
  const [saving, setSaving] = useState(false)
  const [productName, setProductName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  
  const [formData, setFormData] = useState<VariantFormData>({
    sku: '',
    name: '',
    price: '',
    comparePrice: '',
    stock: '0',
    attributes: {},
    images: [],
    isActive: true,
    inventoryNotes: ''
  })

  const [newAttribute, setNewAttribute] = useState({ key: '', value: '' })

  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageUploadError, setImageUploadError] = useState<string | null>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB')
      return
    }

    try {
    setUploadingImage(true)
    setImageUploadError(null)

    const uploadData = new FormData()
    uploadData.append('file', file)
    uploadData.append('alt', `${formData.name || 'variant'} image`)

    const response = await fetch('/api/upload?type=product&optimize=true', {
      method: 'POST',
      body: uploadData
    })

    const data = await response.json()

      if (response.ok) {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, data.url]
        }))
        toast.success('Image uploaded successfully')
      } else {
        setImageUploadError(data.error || 'Failed to upload image')
        toast.error(data.error || 'Failed to upload image')
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      setImageUploadError('Failed to upload image')
      toast.error('Failed to upload image')
    } finally {
      setUploadingImage(false)
      // Reset input
      e.target.value = ''
    }
  }

  const handleRemoveImage = async (imageUrl: string, index: number) => {
    if (!confirm('Remove this image?')) return

    try {
      // Remove from form state immediately (optimistic update)
      setFormData(prev => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index)
      }))

      // Delete from server
      const response = await fetch(`/api/upload?url=${encodeURIComponent(imageUrl)}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Image removed')
      } else {
        // Rollback on error
        setFormData(prev => ({
          ...prev,
          images: [...prev.images.slice(0, index), imageUrl, ...prev.images.slice(index)]
        }))
        toast.error('Failed to delete image from server')
      }
    } catch (error) {
      console.error('Error removing image:', error)
      toast.error('Failed to remove image')
    }
  }

  // ✅ ADD THIS FUNCTION - Set Primary Image
  const handleSetPrimaryImage = (index: number) => {
    setFormData(prev => {
      const newImages = [...prev.images]
      const [primaryImage] = newImages.splice(index, 1)
      return {
        ...prev,
        images: [primaryImage, ...newImages]
      }
    })
    toast.success('Primary image updated')
  }

  useEffect(() => {
    fetchVariants()
    fetchProductInfo()
  }, [params.id])

  useEffect(() => {
    filterVariants()
  }, [variants, searchTerm, stockFilter, statusFilter])

  const fetchProductInfo = async () => {
    try {
      const response = await fetch(`/api/products/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setProductName(data.name)
      }
    } catch (error) {
      console.error('Error fetching product:', error)
    }
  }

  const fetchVariants = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/products/${params.id}/variants?includeInactive=true`)
      if (response.ok) {
        const data = await response.json()
        setVariants(data.variants)
        setStatistics(data.statistics)
      }
    } catch (error) {
      console.error('Error fetching variants:', error)
      toast.error('Failed to fetch variants')
    } finally {
      setLoading(false)
    }
  }

  const filterVariants = () => {
    let filtered = variants

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(v => 
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Object.values(v.attributes).some(attr => 
          attr.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    // Stock filter
    if (stockFilter !== 'all') {
      filtered = filtered.filter(v => {
        if (stockFilter === 'out-of-stock') return v.stock === 0
        if (stockFilter === 'low-stock') return v.stock > 0 && v.stock <= 10
        if (stockFilter === 'in-stock') return v.stock > 10
        return true
      })
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(v => 
        statusFilter === 'active' ? v.isActive : !v.isActive
      )
    }

    setFilteredVariants(filtered)
  }

  const handleOpenDialog = (variant?: ProductVariant) => {
    if (variant) {
      setEditingVariant(variant)
      setFormData({
        sku: variant.sku,
        name: variant.name,
        price: variant.price?.toString() || '',
        comparePrice: variant.comparePrice?.toString() || '',
        stock: variant.stock.toString(),
        attributes: variant.attributes,
        images: variant.images,
        isActive: variant.isActive,
        inventoryNotes: ''
      })
    } else {
      setEditingVariant(null)
      setFormData({
        sku: '',
        name: '',
        price: '',
        comparePrice: '',
        stock: '0',
        attributes: {},
        images: [],
        isActive: true,
        inventoryNotes: ''
      })
    }
    setIsDialogOpen(true)
  }

  const handleAddAttribute = () => {
    if (newAttribute.key && newAttribute.value) {
      setFormData(prev => ({
        ...prev,
        attributes: {
          ...prev.attributes,
          [newAttribute.key]: newAttribute.value
        }
      }))
      setNewAttribute({ key: '', value: '' })
    }
  }

  const handleRemoveAttribute = (key: string) => {
    setFormData(prev => {
      const newAttributes = { ...prev.attributes }
      delete newAttributes[key]
      return { ...prev, attributes: newAttributes }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.sku.trim() || !formData.name.trim()) {
      toast.error('SKU and name are required')
      return
    }

    try {
      setSaving(true)
      const url = editingVariant 
        ? `/api/products/${params.id}/variants/${editingVariant.id}`
        : `/api/products/${params.id}/variants`
      
      const method = editingVariant ? 'PUT' : 'POST'
      
      const payload = {
        ...formData,
        price: formData.price ? parseFloat(formData.price) : null,
        comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : null,
        stock: parseInt(formData.stock)
      }
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(editingVariant ? 'Variant updated successfully' : 'Variant created successfully')
        setIsDialogOpen(false)
        fetchVariants()
      } else {
        toast.error(data.error || 'Failed to save variant')
      }
    } catch (error) {
      console.error('Error saving variant:', error)
      toast.error('Failed to save variant')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (variant: ProductVariant) => {
    if (variant._count.orderItems > 0) {
      toast.error(`Cannot delete variant with ${variant._count.orderItems} orders`)
      return
    }

    if (!confirm(`Delete variant "${variant.name}"?`)) return

    try {
      const response = await fetch(`/api/products/${params.id}/variants/${variant.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Variant deleted successfully')
        fetchVariants()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete variant')
      }
    } catch (error) {
      console.error('Error deleting variant:', error)
      toast.error('Failed to delete variant')
    }
  }

  const handleDuplicate = (variant: ProductVariant) => {
    setEditingVariant(null)
    setFormData({
      sku: `${variant.sku}-COPY`,
      name: `${variant.name} (Copy)`,
      price: variant.price?.toString() || '',
      comparePrice: variant.comparePrice?.toString() || '',
      stock: '0',
      attributes: { ...variant.attributes },
      images: [...variant.images],
      isActive: false,
      inventoryNotes: `Duplicated from ${variant.name}`
    })
    setIsDialogOpen(true)
  }

  const exportVariants = () => {
    const csvContent = [
      ['SKU', 'Name', 'Price', 'Stock', 'Status', 'Orders', 'Attributes'].join(','),
      ...filteredVariants.map(v => [
        v.sku,
        `"${v.name}"`,
        v.price || 'Inherit',
        v.stock,
        v.isActive ? 'Active' : 'Inactive',
        v._count.orderItems,
        `"${Object.entries(v.attributes).map(([k, val]) => `${k}:${val}`).join(', ')}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `variants-${params.id}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Variants exported successfully')
  }

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Out of Stock</Badge>
    } else if (stock <= 10) {
      return <Badge className="bg-yellow-100 text-yellow-800 text-xs"><AlertCircle className="h-3 w-3 mr-1" />Low ({stock})</Badge>
    } else {
      return <Badge className="bg-green-100 text-green-800 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />{stock} units</Badge>
    }
  }

  // Generate insights
  const insights: Array<{ type: 'success' | 'warning' | 'info' | 'error'; title: string; message: string }> = []
  
  if (statistics) {
    if (statistics.outOfStock > 0) {
      insights.push({
        type: 'error',
        title: 'Out of Stock Variants',
        message: `${statistics.outOfStock} variant${statistics.outOfStock > 1 ? 's are' : ' is'} out of stock. Update inventory to avoid lost sales.`
      })
    }
    
    if (statistics.lowStock > 0) {
      insights.push({
        type: 'warning',
        title: 'Low Stock Alert',
        message: `${statistics.lowStock} variant${statistics.lowStock > 1 ? 's have' : ' has'} low stock (≤10 units). Consider restocking soon.`
      })
    }
    
    if (statistics.total > 0 && statistics.active === statistics.total) {
      insights.push({
        type: 'success',
        title: 'All Variants Active',
        message: `All ${statistics.total} variants are currently active and available for sale.`
      })
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center flex-1">
          <Button variant="ghost" size="icon" asChild className="mr-4">
            <Link href={`/dashboard/products/${params.id}`}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg mr-4">
              <Layers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                Product Variants
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {productName ? `Managing variants for: ${productName}` : 'Manage product variations'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={exportVariants} disabled={variants.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Variant
          </Button>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-2 mb-6">
          {insights.map((insight, index) => {
            const IconComponent = 
              insight.type === 'success' ? CheckCircle2 :
              insight.type === 'warning' ? AlertCircle :
              insight.type === 'error' ? XCircle :
              AlertTriangle

            return (
              <Alert
                key={index}
                className={
                  insight.type === 'success' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' :
                  insight.type === 'warning' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20' :
                  insight.type === 'error' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' :
                  'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                }
              >
                <IconComponent className={`h-5 w-5 ${
                  insight.type === 'success' ? 'text-green-600 dark:text-green-400' :
                  insight.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                  insight.type === 'error' ? 'text-red-600 dark:text-red-400' :
                  'text-blue-600 dark:text-blue-400'
                }`} />
                <AlertTitle className="text-sm font-medium">{insight.title}</AlertTitle>
                <AlertDescription className="text-sm">{insight.message}</AlertDescription>
              </Alert>
            )
          })}
        </div>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Variants</p>
                  <p className="text-2xl font-bold">{statistics.total}</p>
                  <p className="text-xs text-gray-500 mt-1">{statistics.active} active</p>
                </div>
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex-shrink-0">
                  <Layers className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Stock</p>
                  <p className="text-2xl font-bold">{statistics.totalStock}</p>
                  <p className="text-xs text-gray-500 mt-1">All variants</p>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
                  <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">In Stock</p>
                  <p className="text-2xl font-bold text-green-600">
                    {statistics.total - statistics.outOfStock}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Available</p>
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-600">{statistics.lowStock}</p>
                  <p className="text-xs text-gray-500 mt-1">≤10 units</p>
                </div>
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">{statistics.outOfStock}</p>
                  <p className="text-xs text-gray-500 mt-1">0 units</p>
                </div>
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg flex-shrink-0">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search variants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Stock Levels</option>
              <option value="in-stock">In Stock</option>
              <option value="low-stock">Low Stock</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('')
                setStockFilter('all')
                setStatusFilter('all')
              }}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>

          {(searchTerm || stockFilter !== 'all' || statusFilter !== 'all') && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
              Showing {filteredVariants.length} of {variants.length} variants
            </p>
          )}
        </CardContent>
      </Card>

      {/* Variants Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : filteredVariants.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {variants.length === 0 ? 'No variants yet' : 'No matching variants'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {variants.length === 0
                ? 'Create variants for different sizes, colors, or configurations.'
                : 'Try adjusting your filters to see more results.'}
            </p>
            {variants.length === 0 ? (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Variant
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setStockFilter('all')
                  setStatusFilter('all')
                }}
              >
                Clear All Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVariants.map((variant) => (
            <Card key={variant.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-1 truncate">{variant.name}</h3>
                    <code className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                      {variant.sku}
                    </code>
                  </div>
                  <Badge variant={variant.isActive ? 'default' : 'secondary'} className="ml-2 flex-shrink-0">
                    {variant.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {Object.keys(variant.attributes).length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attributes:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(variant.attributes).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {key}: {value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator className="my-4" />

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Price:</span>
                    <span className="font-medium">
                      {variant.price ? (
                        <span className="text-green-600 dark:text-green-400">
                          ${variant.price.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-500">Inherit</span>
                      )}
                    </span>
                  </div>
                  {variant.comparePrice && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Compare:</span>
                      <span className="line-through text-gray-500">
                        ${variant.comparePrice.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Stock:</span>
                    {getStockBadge(variant.stock)}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4 pb-4 border-b">
                  <div className="flex items-center gap-1">
                    <ShoppingCart className="h-4 w-4" />
                    <span>{variant._count.orderItems} orders</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    <span>{variant._count.cartItems} in carts</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenDialog(variant)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(variant)}
                    title="Duplicate variant"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(variant)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={variant._count.orderItems > 0}
                    title={variant._count.orderItems > 0 ? 'Cannot delete variant with orders' : 'Delete variant'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              {editingVariant ? 'Edit Variant' : 'Create New Variant'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="e.g., PROD-001-RED-L"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">Variant Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Red - Large"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Leave empty to inherit from product</p>
                </div>
                <div>
                  <Label htmlFor="comparePrice">Compare Price</Label>
                  <Input
                    id="comparePrice"
                    type="number"
                    step="0.01"
                    value={formData.comparePrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, comparePrice: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="stock">Stock *</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <Separator />

              {/* ✅ ADD THIS SECTION - IMAGE MANAGEMENT */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <ImageIcon className="h-4 w-4" />
                  Variant Images
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Upload images specific to this variant. First image will be the primary image.
                </p>

                {/* Image Upload Area */}
                <div className="space-y-3">
                  {/* Uploaded Images Grid */}
                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
                      {formData.images.map((image, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                            <img
                              src={image}
                              alt={`Variant image ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          {/* Image Actions Overlay */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                            {index !== 0 && (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryImage(index)}
                                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-xs font-medium transition-colors"
                                title="Set as primary"
                              >
                                Primary
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(image, index)}
                              className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                              title="Remove image"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          
                          {/* Primary Badge */}
                          {index === 0 && (
                            <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded font-medium">
                              Primary
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Button */}
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
                    <input
                      type="file"
                      id="image-upload"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                    <label
                      htmlFor="image-upload"
                      className={`cursor-pointer flex flex-col items-center ${
                        uploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {uploadingImage ? (
                        <>
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-2"></div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Uploading...
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="h-10 w-10 text-gray-400 mb-2" />
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Click to upload image
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            PNG, JPG, WebP up to 10MB
                          </p>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Upload Error */}
                  {imageUploadError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{imageUploadError}</AlertDescription>
                    </Alert>
                  )}

                  {/* Image Tips */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-xs text-blue-800 dark:text-blue-300 font-medium mb-1">
                      💡 Image Tips:
                    </p>
                    <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-0.5 list-disc list-inside">
                      <li>Use high-quality images (min 800x800px recommended)</li>
                      <li>First image will be shown as the primary variant image</li>
                      <li>Images are automatically optimized for web</li>
                      <li>Drag to reorder (coming soon)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4" />
                  Variant Attributes
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Add attributes like color, size, material, etc.
                </p>
                <div className="space-y-2">
                  {Object.entries(formData.attributes).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                      <Badge variant="secondary" className="flex-1">
                        <span className="font-medium">{key}:</span> {value}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAttribute(key)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Attribute (e.g., Color)"
                      value={newAttribute.key}
                      onChange={(e) => setNewAttribute(prev => ({ ...prev, key: e.target.value }))}
                    />
                    <Input
                      placeholder="Value (e.g., Red)"
                      value={newAttribute.value}
                      onChange={(e) => setNewAttribute(prev => ({ ...prev, value: e.target.value }))}
                    />
                    <Button 
                      type="button" 
                      onClick={handleAddAttribute}
                      disabled={!newAttribute.key || !newAttribute.value}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              

              <div>
                <Label htmlFor="inventoryNotes">Inventory Notes</Label>
                <Textarea
                  id="inventoryNotes"
                  value={formData.inventoryNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, inventoryNotes: e.target.value }))}
                  placeholder="Notes about this stock change..."
                  rows={3}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  These notes will be saved in the inventory log
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                <div>
                  <Label htmlFor="isActive" className="text-base">Active Status</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formData.isActive 
                      ? 'Variant is visible and available for purchase' 
                      : 'Variant is hidden from customers'}
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || uploadingImage}>
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    {editingVariant ? (
                      <>
                        <Edit className="h-4 w-4 mr-2" />
                        Update Variant
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Variant
                      </>
                    )}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}