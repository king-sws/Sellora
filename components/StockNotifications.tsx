// components/StockNotifications.tsx - Stock alerts component
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Package, AlertCircle, TrendingDown, Eye } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface StockAlert {
  id: string
  name: string
  slug: string
  sku: string | null
  stock: number
  price: number
  images: string[]
  category: {
    name: string
  } | null
  _count: {
    orderItems: number
  }
}

interface StockNotificationsProps {
  maxItems?: number
  showTitle?: boolean
  className?: string
}

export default function StockNotifications({ 
  maxItems = 5, 
  showTitle = true,
  className = '' 
}: StockNotificationsProps) {
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({
    lowStock: 0,
    outOfStock: 0,
    total: 0
  })

  useEffect(() => {
    fetchStockAlerts()
    // Refresh every 5 minutes
    const interval = setInterval(fetchStockAlerts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchStockAlerts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/products/stock-alerts')
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.products.slice(0, maxItems))
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Error fetching stock alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (alerts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" />
            Stock Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-green-600 mb-2">
              <Package className="h-8 w-8 mx-auto" />
            </div>
            <p className="text-sm text-gray-600">
              All products have healthy stock levels
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Stock Alerts
          </CardTitle>
          <Badge variant="destructive" className="text-xs">
            {summary.total}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-red-600 font-semibold">{summary.outOfStock}</div>
            <div className="text-xs text-gray-600">Out of Stock</div>
          </div>
          <div className="text-center">
            <div className="text-yellow-600 font-semibold">{summary.lowStock}</div>
            <div className="text-xs text-gray-600">Low Stock</div>
          </div>
        </div>

        {/* Alert List */}
        <div className="space-y-3">
          {alerts.map((product) => (
            <div key={product.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-10 h-10 relative flex-shrink-0">
                <Image
                  src={product.images[0] || '/placeholder.png'}
                  alt={product.name}
                  fill
                  className="object-cover rounded"
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">
                  {product.name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  {product.stock === 0 ? (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-2 w-2 mr-1" />
                      Out of Stock
                    </Badge>
                  ) : (
                    <Badge className="text-xs bg-yellow-100 text-yellow-800">
                      <AlertTriangle className="h-2 w-2 mr-1" />
                      {product.stock} left
                    </Badge>
                  )}
                  {product.category && (
                    <span className="text-xs text-gray-500">
                      {product.category.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-medium">
                  ${product.price.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  {product._count.orderItems} sold
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-3 border-t">
          <Link href="/dashboard/products/stock" className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              View All
            </Button>
          </Link>
          <Link href="/dashboard/products?stock=out" className="flex-1">
            <Button variant="destructive" size="sm" className="w-full">
              <AlertCircle className="h-4 w-4 mr-2" />
              Fix Now
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
