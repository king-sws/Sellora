
// components/DashboardStats.tsx - Dashboard statistics component
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ShoppingCart, 
  Package, 
  Users, 
  AlertTriangle,
  DollarSign
} from 'lucide-react'

interface DashboardStats {
  orders: {
    total: number
    pending: number
    todayRevenue: number
    monthRevenue: number
  }
  products: {
    total: number
    lowStock: number
    outOfStock: number
    inactive: number
  }
  customers: {
    total: number
    newToday: number
    newThisMonth: number
  }
}

export default function DashboardStatsCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
    // Refresh every 5 minutes
    const interval = setInterval(fetchDashboardStats, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/dashboard-stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: `$${stats.orders.monthRevenue.toLocaleString()}`,
      change: `$${stats.orders.todayRevenue.toLocaleString()} today`,
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Orders',
      value: stats.orders.total.toLocaleString(),
      change: `${stats.orders.pending} pending`,
      icon: ShoppingCart,
      color: stats.orders.pending > 0 ? 'text-red-600' : 'text-blue-600',
      alert: stats.orders.pending > 0
    },
    {
      title: 'Products',
      value: stats.products.total.toLocaleString(),
      change: `${stats.products.lowStock + stats.products.outOfStock} need attention`,
      icon: Package,
      color: stats.products.lowStock + stats.products.outOfStock > 0 ? 'text-yellow-600' : 'text-green-600',
      alert: stats.products.lowStock + stats.products.outOfStock > 0
    },
    {
      title: 'Customers',
      value: stats.customers.total.toLocaleString(),
      change: `+${stats.customers.newToday} today`,
      icon: Users,
      color: 'text-purple-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <div className={`${stat.color} relative`}>
              <stat.icon className="h-4 w-4" />
              {stat.alert && (
                <AlertTriangle className="h-3 w-3 absolute -top-1 -right-1 text-red-500" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className={`text-xs ${stat.alert ? 'text-red-600' : 'text-gray-600'}`}>
              {stat.change}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}