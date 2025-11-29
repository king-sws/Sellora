// components/AdminSidebar.tsx - Sidebar with real-time stats
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Star,
  Settings,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'

interface SidebarStats {
  orders: {
    pending: number
    total: number
  }
  products: {
    lowStock: number
    outOfStock: number
    total: number
  }
  reviews: {
    unread: number
    total: number
  }
  customers: {
    total: number
    newToday: number
  }
}

export default function AdminSidebar() {
  const pathname = usePathname()
  const [stats, setStats] = useState<SidebarStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/sidebar-stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching sidebar stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const menuItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      label: 'Orders',
      href: '/dashboard/orders',
      icon: ShoppingCart,
      badge: stats?.orders.pending || 0,
      badgeVariant: 'destructive' as const
    },
    {
      label: 'Products',
      href: '/dashboard/products',
      icon: Package,
      badge: stats ? stats.products.lowStock + stats.products.outOfStock : 0,
      badgeVariant: 'secondary' as const,
      subItems: [
        {
          label: 'All Products',
          href: '/dashboard/products',
          badge: null
        },
        {
          label: 'Stock Alerts',
          href: '/dashboard/products/stock',
          badge: stats ? stats.products.lowStock + stats.products.outOfStock : 0,
          badgeVariant: 'destructive' as const
        },
        {
          label: 'Add Product',
          href: '/dashboard/products/new',
          badge: null
        }
      ]
    },
    {
      label: 'Customers',
      href: '/dashboard/customers',
      icon: Users,
      badge: stats?.customers.newToday || 0,
      badgeVariant: 'default' as const
    },
    {
      label: 'Reviews',
      href: '/dashboard/reviews',
      icon: Star,
      badge: stats?.reviews.unread || 0,
      badgeVariant: 'secondary' as const
    },
    {
      label: 'Settings',
      href: '/dashboard/settings',
      icon: Settings,
      badge: null
    }
  ]

  return (
    <div className="w-64 bg-white border-r h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold">Admin Panel</h2>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-gray-500">
            {loading ? 'Loading...' : 'Live Stats'}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchStats}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <div key={item.href}>
            <Link
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === item.href
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
              {item.badge !== null && item.badge > 0 && (
                <Badge variant={item.badgeVariant} className="text-xs">
                  {item.badge > 99 ? '99+' : item.badge}
                </Badge>
              )}
            </Link>

            {/* Sub Items */}
            {item.subItems && pathname.startsWith(item.href) && (
              <div className="ml-8 mt-2 space-y-1">
                {item.subItems.map((subItem) => (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      pathname === subItem.href
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex-1">{subItem.label}</span>
                    {subItem.badge !== null && subItem.badge > 0 && (
                      <Badge variant={subItem.badgeVariant} className="text-xs">
                        {subItem.badge > 99 ? '99+' : subItem.badge}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Quick Stats */}
      {stats && (
        <div className="p-4 border-t bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Overview</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white p-2 rounded">
              <div className="font-medium">{stats.orders.total}</div>
              <div className="text-gray-500">Total Orders</div>
            </div>
            <div className="bg-white p-2 rounded">
              <div className="font-medium">{stats.products.total}</div>
              <div className="text-gray-500">Products</div>
            </div>
            <div className="bg-white p-2 rounded">
              <div className="font-medium">{stats.customers.total}</div>
              <div className="text-gray-500">Customers</div>
            </div>
            <div className="bg-white p-2 rounded">
              <div className="font-medium">{stats.reviews.total}</div>
              <div className="text-gray-500">Reviews</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

