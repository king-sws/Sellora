
// components/admin/customer-analytics.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, UserCheck, Crown, TrendingUp } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface CustomerStats {
  totalCustomers: number
  newCustomersThisMonth: number
  customersWithOrders: number
  conversionRate: string
  topCustomers: Array<{
    id: string
    name: string | null
    email: string | null
    totalSpent: number
  }>
}

export function CustomerAnalytics() {
  const [stats, setStats] = useState<CustomerStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/customers/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching customer stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Customer Insights</h3>
          <Link 
            href="/dashboard/customers"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View All
          </Link>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Customer Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
              <p className="text-sm text-gray-500">Total Customers</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.customersWithOrders}</p>
              <p className="text-sm text-gray-500">Active Customers</p>
            </div>
          </div>
        </div>

        {/* Growth Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-gray-900">New This Month</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.newCustomersThisMonth}</p>
          </div>
          
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Crown className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-900">Conversion Rate</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.conversionRate}%</p>
          </div>
        </div>

        {/* Top Customers */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Top Customers</h4>
          <div className="space-y-3">
            {stats.topCustomers.slice(0, 5).map((customer, index) => (
              <div key={customer.id} className="flex items-center space-x-3">
                <div className="flex-shrink-0 text-xs font-medium text-gray-400 w-4">
                  #{index + 1}
                </div>
                <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600">
                    {customer.name ? customer.name.charAt(0).toUpperCase() : customer.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {customer.name || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatPrice(customer.totalSpent)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}