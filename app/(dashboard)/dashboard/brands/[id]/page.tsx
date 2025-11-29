/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(dashboard)/dashboard/brands/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Building2, ArrowLeft, Edit, Trash2, Globe, 
  Package, Calendar, Clock, ExternalLink,
  CheckCircle, XCircle, AlertCircle, RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { formatDate, formatPrice } from '@/lib/utils'

interface Brand {
  id: string
  name: string
  slug: string
  logo: string | null
  description: string | null
  website: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: {
    products: number
  }
  products?: any[]
}

export default function BrandDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [brand, setBrand] = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchBrand()
  }, [params.id])

  const fetchBrand = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/brands/${params.id}?includeProducts=true`)
      
      if (!response.ok) throw new Error('Failed to fetch brand')
      
      const data = await response.json()
      setBrand(data)
    } catch (error) {
      console.error('Error fetching brand:', error)
      toast.error('Failed to load brand')
      router.push('/dashboard/brands')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${brand?.name}"? This action cannot be undone.`)) {
      return
    }
    
    try {
      setDeleting(true)
      const response = await fetch(`/api/brands/${params.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }
      
      toast.success('Brand deleted successfully')
      router.push('/dashboard/brands')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete brand')
      setDeleting(false)
    }
  }

  const toggleStatus = async () => {
    if (!brand) return
    
    try {
      const response = await fetch(`/api/brands/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !brand.isActive })
      })
      
      if (!response.ok) throw new Error('Failed to update status')
      
      toast.success(`Brand ${!brand.isActive ? 'activated' : 'deactivated'}`)
      fetchBrand()
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardContent className="p-6">
                <Skeleton className="h-48 w-full mb-4" />
                <Skeleton className="h-8 w-full mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
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
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Brand not found</h2>
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
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
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
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                {brand.name}
              </h1>
              <p className="text-slate-600 text-sm">Brand Details</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleStatus}
            >
              {brand.isActive ? (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Deactivate
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Activate
                </>
              )}
            </Button>
            
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/brands/${brand.id}/edit`}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Link>
            </Button>
            
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleDelete}
              disabled={deleting || brand._count.products > 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Brand Info Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Brand Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo */}
              <div className="flex flex-col items-center">
                <div className="w-48 h-48 bg-slate-100 rounded-xl overflow-hidden border-2 border-slate-200 flex items-center justify-center mb-4">
                  {brand.logo ? (
                    <Image
                      src={brand.logo}
                      alt={brand.name}
                      width={192}
                      height={192}
                      className="w-full h-full object-contain p-4"
                    />
                  ) : (
                    <Building2 className="w-24 h-24 text-slate-400" />
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Badge variant={brand.isActive ? 'default' : 'secondary'}>
                    {brand.isActive ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 mr-1" />
                        Inactive
                      </>
                    )}
                  </Badge>
                  
                  <Badge variant="outline" className="gap-1">
                    <Package className="w-3 h-3" />
                    {brand._count.products} Products
                  </Badge>
                </div>
              </div>
              
              <Separator />
              
              {/* Details */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Brand Name</p>
                  <p className="text-slate-900">{brand.name}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Slug</p>
                  <code className="text-sm bg-slate-100 px-2 py-1 rounded">
                    {brand.slug}
                  </code>
                </div>
                
                {brand.website && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Website</p>
                    <a 
                      href={brand.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                    >
                      <Globe className="w-3 h-3" />
                      {new URL(brand.website).hostname}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Created
                  </p>
                  <p className="text-sm text-slate-600">
                    {formatDate(brand.createdAt, 'long')}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last Updated
                  </p>
                  <p className="text-sm text-slate-600">
                    {formatDate(brand.updatedAt, 'long')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {brand.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 leading-relaxed">
                    {brand.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Products */}
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Products</CardTitle>
                  <CardDescription>
                    {brand._count.products} product{brand._count.products !== 1 ? 's' : ''} in this brand
                  </CardDescription>
                </div>
                {brand._count.products > 0 && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/products?brand=${brand.slug}`}>
                      View All Products
                    </Link>
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {brand.products && brand.products.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {brand.products.map((product) => (
                      <Link 
                        key={product.id} 
                        href={`/dashboard/products/${product.id}`}
                        className="group"
                      >
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all">
                          <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                            {product.images?.[0] ? (
                              <Image
                                src={product.images[0]}
                                alt={product.name}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-6 h-6 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 text-sm truncate group-hover:text-blue-600">
                              {product.name}
                            </p>
                            <p className="text-sm text-slate-600">
                              {formatPrice(product.price)}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {product.isFeatured && (
                                <Badge variant="secondary" className="text-xs">Featured</Badge>
                              )}
                              <Badge 
                                variant={product.stock > 0 ? 'outline' : 'destructive'} 
                                className="text-xs"
                              >
                                {product.stock} in stock
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 mb-4">No products in this brand yet</p>
                    <Button asChild>
                      <Link href={`/dashboard/products/new?brand=${brand.id}`}>
                        <Package className="w-4 h-4 mr-2" />
                        Add Product
                      </Link>
                    </Button>
                  </div>
                )}
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
          </div>
        </div>
      </div>
    </div>
  )
}