/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// components/admin/sidebar.tsx (Enterprise Professional Design - Fixed)
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { 
  LayoutDashboard, Package, ShoppingCart, Users, 
  BarChart3, Settings, Tags, Star, Store, Archive,Bandage,
  AlertCircle, TrendingUp, Menu, Mail, ChevronRight,
  Plus, Eye, UserCheck, PanelLeftOpen, PanelLeftClose, TicketPercent,
  Megaphone
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface SidebarStats {
  orders: {
    pending: number
    processing: number
    shipped: number
    delivered: number
    total: number
  }
  products: {
    lowStock: number
    outOfStock: number
    total: number
    active: number
  }
  reviews: {
    unread: number
    total: number
    averageRating: number
  }
  customers: {
    total: number
    newToday: number
    active: number
  }
  coupons?: {
    active: number
  }
  promos?: {
    active: number
  }
}

interface SidebarItem {
  name: string
  href: string
  icon: any
  badge?: number | string
  badgeColor?: 'critical' | 'warning' | 'success' | 'info' | 'neutral'
  children?: SidebarItem[]
}

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [expandedItems, setExpandedItems] = useState<string[]>(['products'])
  const [stats, setStats] = useState<SidebarStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchSidebarStats()
      const interval = setInterval(fetchSidebarStats, 60000)
      return () => clearInterval(interval)
    }
  }, [session])

  const fetchSidebarStats = async () => {
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

  if (session?.user?.role !== 'ADMIN') {
    return null
  }

  const toggleExpanded = (name: string) => {
    if (isCollapsed) return
    setExpandedItems(prev => 
      prev.includes(name) 
        ? prev.filter(item => item !== name)
        : [...prev, name]
    )
  }

  const getBadgeStyles = (color?: string) => {
    switch (color) {
      case 'critical':
        return 'bg-red-600 text-white text-[10px] font-semibold'
      case 'warning':
        return 'bg-amber-600 text-white text-[10px] font-semibold'
      case 'success':
        return 'bg-emerald-600 text-white text-[10px] font-semibold'
      case 'info':
        return 'bg-blue-600 text-white text-[10px] font-semibold'
      default:
        return 'bg-slate-600 text-white text-[10px] font-semibold'
    }
  }

  const sidebarItems: SidebarItem[] = [
    {
      name: 'Overview',
      href: '/dashboard',
      icon: LayoutDashboard
    },
    {
      name: 'Products',
      href: '/dashboard/products',
      icon: Package,
      badge: stats?.products.lowStock && stats.products.outOfStock 
        ? stats.products.lowStock + stats.products.outOfStock 
        : undefined,
      badgeColor: 'warning',
      children: [
        { 
          name: 'All Products', 
          href: '/dashboard/products', 
          icon: Package,
          badge: stats?.products.total,
          badgeColor: 'info'
        },
        { 
          name: 'Add New', 
          href: '/dashboard/products/new', 
          icon: Plus
        },
        { 
          name: 'Brands', 
          href: '/dashboard/brands', 
          icon: Bandage
        },
        { 
          name: 'Categories', 
          href: '/dashboard/categories', 
          icon: Tags
        },
        { 
          name: 'Stock Management', 
          href: '/dashboard/products/stock', 
          icon: Archive
        },
        { 
          name: 'Low Stock', 
          href: '/dashboard/products?stock=low', 
          icon: AlertCircle,
          badge: stats?.products.lowStock || undefined,
          badgeColor: 'warning'
        },
        { 
          name: 'Out of Stock', 
          href: '/dashboard/products?stock=out', 
          icon: AlertCircle,
          badge: stats?.products.outOfStock || undefined,
          badgeColor: 'critical'
        }
      ]
    },
    {
      name: 'Orders',
      href: '/dashboard/orders',
      icon: ShoppingCart,
      badge: stats?.orders.pending || undefined,
      badgeColor: 'critical',
      children: [
        { 
          name: 'All Orders', 
          href: '/dashboard/orders', 
          icon: ShoppingCart,
          badge: stats?.orders.total,
          badgeColor: 'info'
        },
        { 
          name: 'Pending', 
          href: '/dashboard/orders/pending', 
          icon: AlertCircle,
          badge: stats?.orders.pending || undefined,
          badgeColor: 'critical'
        },
        { 
          name: 'Processing', 
          href: '/dashboard/orders/processing', 
          icon: Package,
          badge: stats?.orders.processing || undefined,
          badgeColor: 'warning'
        },
        { 
          name: 'Shipped', 
          href: '/dashboard/orders/shipped', 
          icon: TrendingUp,
          badge: stats?.orders.shipped || undefined,
          badgeColor: 'info'
        },
        { 
          name: 'Delivered', 
          href: '/dashboard/orders/delivered', 
          icon: UserCheck,
          badge: stats?.orders.delivered || undefined,
          badgeColor: 'success'
        }
      ]
    },
    {
      name: 'Customers',
      href: '/dashboard/customers',
      icon: Users,
      badge: stats?.customers.newToday ? `+${stats.customers.newToday}` : undefined,
      badgeColor: 'success'
    },
    {
  name: 'Newsletter',
  href: '/dashboard/newsletter',
  icon: Mail,
  children: [
    {
      name: 'All Campaigns',
      href: '/dashboard/newsletter',
      icon: Mail,
    },
    {
      name: 'Create Campaign',
      href: '/dashboard/newsletter/campaign',
      icon: Plus,
    },
    {
      name: 'Subscribers',
      href: '/dashboard/newsletter/subscribers',
      icon: Users,
    }
  ]
},

      {
    name: "Promos",
    href: "/dashboard/promos",
    icon: Megaphone,                // ✔ Correct icon for promotions
    badge: stats?.promos?.active || undefined,
    badgeColor: "success",
  },
    {
      name: 'Reviews',
      href: '/dashboard/reviews',
      icon: Star,
      badge: stats?.reviews.unread || undefined,
      badgeColor: 'info'
    },
      {
    name: 'Coupons',
    href: '/dashboard/coupons',
    icon: TicketPercent, // 🎟️ Coupon/discount icon
    badge: stats?.coupons?.active || undefined,
    badgeColor: 'info'
  },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: BarChart3
    },
    {
      name: 'Settings',
      href: '/dashboard/settings',
      icon: Settings
    }
  ]

  const renderSidebarItem = (item: SidebarItem, isChild = false, isMobile = false) => {
    const isActive = pathname === item.href
    const isParentActive = item.children && item.children.some(child => pathname === child.href)
    const isExpanded = expandedItems.includes(item.name.toLowerCase())
    const hasChildren = item.children && item.children.length > 0

    if (hasChildren) {
      return (
        <div key={item.name} className="mb-1">
          <button
            onClick={() => toggleExpanded(item.name.toLowerCase())}
            className={cn(
              "w-full flex items-center justify-between text-left rounded-lg transition-all duration-200 group",
              isCollapsed && !isMobile 
                ? "px-2 py-3 mx-1" 
                : "px-3 py-2.5",
              isParentActive 
                ? "bg-slate-100 text-slate-900" 
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <div className={cn(
              "flex items-center min-w-0",
              isCollapsed && !isMobile ? "justify-center w-full" : "flex-1"
            )}>
              <item.icon className={cn(
                "flex-shrink-0",
                isCollapsed && !isMobile ? "w-5 h-5" : "w-4 h-4 mr-3",
                isParentActive ? "text-slate-700" : "text-slate-400"
              )} />
              {(!isCollapsed || isMobile) && (
                <span className="text-sm font-medium truncate">{item.name}</span>
              )}
            </div>
            {(!isCollapsed || isMobile) && (
              <div className="flex items-center space-x-1.5 ml-2 flex-shrink-0">
                {item.badge && (
                  <Badge className={cn("px-1.5 py-0.5 h-5 rounded-full", getBadgeStyles(item.badgeColor))}>
                    {loading ? "•••" : item.badge}
                  </Badge>
                )}
                <ChevronRight className={cn(
                  "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
                  isExpanded && "rotate-90"
                )} />
              </div>
            )}
          </button>

          {hasChildren && isExpanded && (!isCollapsed || isMobile) && (
            <div className="mt-1 ml-4 border-l border-slate-200 pl-3 space-y-1">
              {item.children!.map(child => renderSidebarItem(child, true, isMobile))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link 
        key={item.name} 
        href={item.href} 
        className="block mb-1"
        onClick={() => isMobile && setMobileOpen(false)}
      >
        <div className={cn(
          "flex items-center rounded-lg transition-all duration-200 group",
          isCollapsed && !isMobile 
            ? "px-2 py-3 mx-1 justify-center" 
            : "px-3 py-2.5 justify-between",
          isChild && "py-2",
          isActive 
            ? isCollapsed && !isMobile
              ? "bg-slate-900 text-white shadow-lg"
              : "bg-slate-900 text-white shadow-sm" 
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        )}>
          <div className={cn(
            "flex items-center min-w-0",
            isCollapsed && !isMobile ? "justify-center w-full" : "flex-1"
          )}>
            <item.icon className={cn(
              "flex-shrink-0",
              isCollapsed && !isMobile ? "w-5 h-5" : "w-4 h-4 mr-3",
              isActive ? "text-white" : "text-slate-400"
            )} />
            {(!isCollapsed || isMobile) && (
              <span className={cn(
                "font-medium truncate",
                isChild ? "text-sm" : "text-sm"
              )}>
                {item.name}
              </span>
            )}
          </div>
          {item.badge && (!isCollapsed || isMobile) && (
            <Badge className={cn(
              "px-1.5 py-0.5 h-5 rounded-full ml-2 flex-shrink-0",
              isActive ? "bg-white/20 text-white text-[10px] font-semibold" : getBadgeStyles(item.badgeColor)
            )}>
              {loading ? "•••" : item.badge}
            </Badge>
          )}
        </div>
      </Link>
    )
  }

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={cn(
      "flex flex-col bg-white border-r border-slate-200 ",
      isMobile ? "h-full" : "h-screen"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center border-b border-slate-200 flex-shrink-0",
        isCollapsed && !isMobile ? "px-2 py-4 justify-center" : "px-4 py-4 justify-between"
      )}>
        {(!isCollapsed || isMobile) && (
          <Link href="/" className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <Store className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-semibold text-slate-900 truncate">Admin Panel</h1>
              {stats && (
                <p className="text-xs text-slate-500 truncate">
                  {stats.orders.pending} pending • {stats.products.lowStock + stats.products.outOfStock} alerts
                </p>
              )}
            </div>
          </Link>
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "h-8 w-8 p-0 hover:bg-slate-100 flex-shrink-0",
              isCollapsed && "mx-auto"
            )}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-4 w-4 text-slate-600" />
            ) : (
              <PanelLeftClose className="h-4 w-4 text-slate-600" />
            )}
          </Button>
        )}
      </div>

      {/* User Profile */}
      {(!isCollapsed || isMobile) && session?.user && (
        <div className="px-4 py-3 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={session.user.image || ''} />
              <AvatarFallback className="bg-slate-900 text-white text-xs font-medium">
                {session.user.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 truncate">{session.user.name}</p>
              <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
            </div>
            <Badge variant="outline" className="text-xs text-slate-600 border-slate-300 flex-shrink-0">
              Admin
            </Badge>
          </div>
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto content-scrollable min-h-0">
        <div className={cn(
          isCollapsed && !isMobile ? "px-1 py-4" : "px-4 py-4"
        )}>
          {/* Navigation */}
          <nav className="space-y-1">
            {sidebarItems.map(item => renderSidebarItem(item, false, isMobile))}
          </nav>

          {/* Quick Stats */}
          {(!isCollapsed || isMobile) && stats && (
            <div className="mt-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
                Overview
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Total Orders</span>
                  <span className="font-semibold text-slate-900">{stats.orders.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Products</span>
                  <span className="font-semibold text-slate-900">{stats.products.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Customers</span>
                  <span className="font-semibold text-slate-900">{stats.customers.total.toLocaleString()}</span>
                </div>
                {stats.customers.newToday > 0 && (
                  <div className="flex justify-between items-center text-sm pt-1 border-t border-slate-200">
                    <span className="text-emerald-600">New Today</span>
                    <span className="font-semibold text-emerald-600">+{stats.customers.newToday}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className={cn(
        "border-t border-slate-200 space-y-2 flex-shrink-0",
        isCollapsed && !isMobile ? "px-2 py-3" : "px-4 py-3"
      )}>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "justify-start h-9 text-slate-600 border-slate-300 hover:bg-slate-50",
            isCollapsed && !isMobile ? "w-10 px-0" : "w-full"
          )}
          asChild
        >
          <Link href="/" target="_blank">
            <Eye className={cn(
              "h-4 w-4",
              isCollapsed && !isMobile ? "" : "mr-2"
            )} />
            {(!isCollapsed || isMobile) && "View Store"}
          </Link>
        </Button>
        
        {stats?.orders.pending && stats.orders.pending > 0 && (
          <Button
            size="sm"
            className={cn(
              "justify-start h-9 bg-red-600 hover:bg-red-700 text-white",
              isCollapsed && !isMobile ? "w-10 px-0" : "w-full"
            )}
            asChild
          >
            <Link href="/dashboard/orders?status=PENDING">
              <AlertCircle className={cn(
                "h-4 w-4",
                isCollapsed && !isMobile ? "" : "mr-2"
              )} />
              {(!isCollapsed || isMobile) && `${stats.orders.pending} Pending Orders`}
            </Link>
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <div className={className}>
      {/* Mobile Menu Button */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="lg:hidden fixed top-4 left-4 z-50 bg-white shadow-sm"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SidebarContent isMobile={true} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:block h-screen sticky top-0 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-72"
      )}>
        <SidebarContent isMobile={false} />
      </div>
    </div>
  )
}