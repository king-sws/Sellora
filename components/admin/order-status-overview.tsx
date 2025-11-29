// components/admin/order-status-overview.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Clock, CheckCircle, Package, Truck, 
  XCircle, AlertCircle, TrendingUp, TrendingDown,
  Eye, MoreHorizontal
} from 'lucide-react'

interface OrderStats {
  orders: {
    total: number
    pending: number
    confirmed: number
    processing: number
    shipped: number
    delivered: number
    cancelled: number
    refunded: number
  }
  products: {
    total: number
    active: number
    lowStock: number
    outOfStock: number
  }
  customers: {
    total: number
    newThisMonth: number
  }
}

const statusConfig = {
  pending: {
    key: 'pending',
    label: 'Pending Orders',
    description: 'Orders awaiting confirmation',
    icon: Clock,
    color: 'yellow',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-600',
    borderColor: 'border-yellow-200',
    href: '/dashboard/orders?status=PENDING',
    urgent: true
  },
  confirmed: {
    key: 'confirmed',
    label: 'Confirmed Orders',
    description: 'Orders ready for processing',
    icon: CheckCircle,
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    href: '/dashboard/orders?status=CONFIRMED',
    urgent: false
  },
  processing: {
    key: 'processing',
    label: 'Processing Orders',
    description: 'Orders being prepared',
    icon: Package,
    color: 'purple',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-800',
    iconColor: 'text-purple-600',
    borderColor: 'border-purple-200',
    href: '/dashboard/orders?status=PROCESSING',
    urgent: false
  },
  shipped: {
    key: 'shipped',
    label: 'Shipped Orders',
    description: 'Orders in transit',
    icon: Truck,
    color: 'indigo',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-800',
    iconColor: 'text-indigo-600',
    borderColor: 'border-indigo-200',
    href: '/dashboard/orders?status=SHIPPED',
    urgent: false
  },
  delivered: {
    key: 'delivered',
    label: 'Delivered Orders',
    description: 'Successfully completed',
    icon: CheckCircle,
    color: 'green',
    bgColor: 'bg-green-50',
    textColor: 'text-green-800',
    iconColor: 'text-green-600',
    borderColor: 'border-green-200',
    href: '/dashboard/orders?status=DELIVERED',
    urgent: false
  },
  cancelled: {
    key: 'cancelled',
    label: 'Cancelled Orders',
    description: 'Orders that were cancelled',
    icon: XCircle,
    color: 'red',
    bgColor: 'bg-red-50',
    textColor: 'text-red-800',
    iconColor: 'text-red-600',
    borderColor: 'border-red-200',
    href: '/dashboard/orders?status=CANCELLED',
    urgent: false
  },
  refunded: {
    key: 'refunded',
    label: 'Refunded Orders',
    description: 'Orders with refunds issued',
    icon: AlertCircle,
    color: 'gray',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-800',
    iconColor: 'text-gray-600',
    borderColor: 'border-gray-200',
    href: '/dashboard/orders?status=REFUNDED',
    urgent: false
  }
}

export function OrderStatusOverview() {
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    // Refresh every 2 minutes
    const interval = setInterval(fetchStats, 120000)
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              <div className="w-6 h-6 bg-gray-200 rounded"></div>
            </div>
            <div className="w-16 h-8 bg-gray-200 rounded mb-2"></div>
            <div className="w-24 h-4 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-gray-500 text-center">Failed to load order statistics</p>
      </div>
    )
  }

  const getPercentage = (value: number) => {
    return stats.orders.total > 0 ? ((value / stats.orders.total) * 100).toFixed(1) : '0'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Order Status Overview</h2>
          <p className="text-gray-600 mt-1">
            {stats.orders.total} total orders • {stats.orders.pending} need attention
          </p>
        </div>
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Eye className="w-4 h-4 mr-2" />
          View All Orders
        </Link>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Object.entries(statusConfig).map(([key, config]) => {
          const count = stats.orders[key as keyof typeof stats.orders] as number
          const percentage = getPercentage(count)
          const Icon = config.icon

          return (
            <Link
              key={key}
              href={config.href}
              className={`block p-6 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
                config.urgent && count > 0
                  ? `${config.bgColor} ${config.borderColor} ring-2 ring-${config.color}-200`
                  : `bg-white border-gray-200 hover:${config.borderColor}`
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${config.bgColor}`}>
                  <Icon className={`w-6 h-6 ${config.iconColor}`} />
                </div>
                {config.urgent && count > 0 && (
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 text-lg">
                  {count.toLocaleString()}
                </h3>
                <p className="text-sm font-medium text-gray-700">
                  {config.label}
                </p>
                <p className="text-xs text-gray-500">
                  {config.description}
                </p>
                
                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>{percentage}% of total</span>
                    <span>{count}/{stats.orders.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full bg-${config.color}-500`}
                      style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              {/* Hover indicator */}
              <div className="mt-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-gray-500">Click to view</span>
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* Summary Stats */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {stats.orders.total.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Orders</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="text-3xl font-bold text-yellow-600 mr-2">
                {stats.orders.pending}
              </div>
              {stats.orders.pending > 0 && (
                <TrendingUp className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className="text-sm text-gray-600">Need Attention</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="text-3xl font-bold text-green-600 mr-2">
                {((stats.orders.delivered / stats.orders.total) * 100).toFixed(1)}%
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </div>
        </div>
      </div>

      {/* Action Items */}
      {(stats.orders.pending > 0 || stats.orders.confirmed > 0 || stats.orders.processing > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4">
            Action Items
          </h3>
          <div className="space-y-3">
            {stats.orders.pending > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-yellow-600 mr-3" />
                  <span className="text-yellow-800">
                    {stats.orders.pending} orders awaiting confirmation
                  </span>
                </div>
                <Link
                  href="/dashboard/orders?status=PENDING"
                  className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded text-sm hover:bg-yellow-300"
                >
                  Review Now
                </Link>
              </div>
            )}
            
            {stats.orders.confirmed > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Package className="w-5 h-5 text-blue-600 mr-3" />
                  <span className="text-yellow-800">
                    {stats.orders.confirmed} orders ready for processing
                  </span>
                </div>
                <Link
                  href="/dashboard/orders?status=CONFIRMED"
                  className="px-3 py-1 bg-blue-200 text-blue-800 rounded text-sm hover:bg-blue-300"
                >
                  Process
                </Link>
              </div>
            )}
            
            {stats.orders.processing > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Truck className="w-5 h-5 text-purple-600 mr-3" />
                  <span className="text-yellow-800">
                    {stats.orders.processing} orders ready to ship
                  </span>
                </div>
                <Link
                  href="/dashboard/orders?status=PROCESSING"
                  className="px-3 py-1 bg-purple-200 text-purple-800 rounded text-sm hover:bg-purple-300"
                >
                  Ship Orders
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
