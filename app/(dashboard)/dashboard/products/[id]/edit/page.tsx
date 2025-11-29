// app/(dashboard)/dashboard/products/[id]/edit/page.tsx
import { notFound } from 'next/navigation'
import { prisma } from '@/db/prisma'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductForm } from '@/components/forms/product-form'
import { Package, Edit, History, Layers } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import InventoryTimeline from '../components/InventoryTimeline'

interface EditProductPageProps {
  params: {
    id: string
  }
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const [product, categories, brands] = await Promise.all([
    prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true
          }
        },
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true
          }
        },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            stock: true,
            attributes: true,
            isActive: true
          },
          orderBy: { createdAt: 'desc' }
        },
        inventoryLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            changedByUser: {
              select: {
                name: true,
                image: true
              }
            },
            variant: {
              select: {
                id: true,
                name: true,
                sku: true
              }
            }
          }
        },
        _count: {
          select: {
            variants: true,
            inventoryLogs: true
          }
        }
      }
    }),
    prisma.category.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true
      },
      orderBy: { name: 'asc' }
    }),
    prisma.brand.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true
      },
      orderBy: { name: 'asc' }
    })
  ])

  if (!product) {
    notFound()
  }

  // Calculate inventory stats
  const totalStock = product.variants.length > 0
    ? product.variants.reduce((sum, v) => sum + v.stock, 0)
    : product.stock

  const lowStockVariants = product.variants.filter(v => v.stock <= 10 && v.stock > 0)
  const outOfStockVariants = product.variants.filter(v => v.stock === 0)

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Edit Product</h1>
          <p className="text-muted-foreground mt-1">{product.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/products/${product.id}`}>
              View Details
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/products">
              Back to Products
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Stock</p>
                <p className="text-2xl font-bold">{totalStock}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Variants</p>
                <p className="text-2xl font-bold">{product._count.variants}</p>
              </div>
              <Layers className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-600">{lowStockVariants.length}</p>
              </div>
              <Package className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{outOfStockVariants.length}</p>
              </div>
              <Package className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Product Details
          </TabsTrigger>
          <TabsTrigger value="variants" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Variants
            {product._count.variants > 0 && (
              <Badge variant="secondary" className="ml-1">
                {product._count.variants}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventory
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
            {product._count.inventoryLogs > 0 && (
              <Badge variant="secondary" className="ml-1">
                {product._count.inventoryLogs}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Product Details Tab */}
        <TabsContent value="details">
          <ProductForm
            initialData={product}
            categories={categories}
            brands={brands}
          />
        </TabsContent>

        {/* Variants Tab */}
        <TabsContent value="variants">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Product Variants</CardTitle>
                  <CardDescription>
                    Manage different variations of this product
                  </CardDescription>
                </div>
                <Button asChild>
                  <Link href={`/dashboard/products/${product.id}/variants`}>
                    Manage Variants
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {product.variants.length === 0 ? (
                <div className="text-center py-12">
                  <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No variants created yet</p>
                  <Button asChild>
                    <Link href={`/dashboard/products/${product.id}/variants`}>
                      Create First Variant
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {product.variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{variant.name}</h4>
                          <Badge variant={variant.isActive ? 'default' : 'secondary'}>
                            {variant.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {variant.stock <= 10 && variant.stock > 0 && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                              Low Stock
                            </Badge>
                          )}
                          {variant.stock === 0 && (
                            <Badge variant="destructive">Out of Stock</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>SKU: {variant.sku}</span>
                          <span>•</span>
                          <span>Stock: {variant.stock}</span>
                          <span>•</span>
                          <span>
                            Price: {variant.price ? `$${variant.price.toFixed(2)}` : 'Inherit'}
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/products/${product.id}/variants`}>
                          Edit
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory">
          <div className="space-y-6">
            {/* Stock Alerts */}
            {(lowStockVariants.length > 0 || outOfStockVariants.length > 0) && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="text-yellow-800 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Stock Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {outOfStockVariants.length > 0 && (
                    <div>
                      <p className="font-medium text-red-700 mb-2">
                        Out of Stock ({outOfStockVariants.length})
                      </p>
                      <div className="space-y-1">
                        {outOfStockVariants.map(v => (
                          <p key={v.id} className="text-sm text-red-600">• {v.name}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {lowStockVariants.length > 0 && (
                    <div>
                      <p className="font-medium text-yellow-700 mb-2">
                        Low Stock ({lowStockVariants.length})
                      </p>
                      <div className="space-y-1">
                        {lowStockVariants.map(v => (
                          <p key={v.id} className="text-sm text-yellow-600">
                            • {v.name} - {v.stock} remaining
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Current Inventory */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Current Inventory</CardTitle>
                    <CardDescription>Real-time stock levels</CardDescription>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/dashboard/products/${product.id}/inventory`}>
                      View Full History
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Base Product Stock */}
                  {product.variants.length === 0 && (
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Base Product</p>
                        <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                      </div>
                      <Badge 
                        variant={product.stock > 10 ? 'default' : product.stock > 0 ? 'secondary' : 'destructive'}
                      >
                        {product.stock} in stock
                      </Badge>
                    </div>
                  )}

                  {/* Variant Stock */}
                  {product.variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{variant.name}</p>
                        <p className="text-sm text-muted-foreground">SKU: {variant.sku}</p>
                      </div>
                      <Badge 
                        variant={variant.stock > 10 ? 'default' : variant.stock > 0 ? 'secondary' : 'destructive'}
                      >
                        {variant.stock} in stock
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/products/${product.id}/inventory`}>
                    <History className="h-4 w-4 mr-2" />
                    Full Inventory Log
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/products/${product.id}/variants`}>
                    <Layers className="h-4 w-4 mr-2" />
                    Adjust Stock
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Recent Inventory Timeline */}
            <InventoryTimeline
              productId={product.id}
              variantId={null}
              limit={10}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export async function generateMetadata({ params }: EditProductPageProps) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    select: { name: true }
  })

  return {
    title: product ? `Edit ${product.name}` : 'Edit Product',
    description: `Edit product information for ${product?.name || 'this product'}`
  }
}