/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/types/dashboard.ts - TypeScript interfaces for type safety

export interface DashboardData {
  // Key Metrics
  totalRevenue: number
  totalOrders: number
  totalCustomers: number
  totalProducts: number
  
  // Monthly Stats
  monthlyRevenue: number
  weeklyRevenue: number
  monthlyGrowth: number
  newCustomersThisMonth: number
  newCustomersThisWeek: number
  
  // Product Stats
  activeProducts: number
  featuredProducts: number
  lowStockProducts: number
  outOfStockProducts: number
  
  // Order Status
  pendingOrders: number
  processingOrders: number
  shippedOrders: number
  deliveredOrders: number
  cancelledOrders: number
  ordersByStatus: OrderStatusCount[]
  
  // Payment & Refunds
  paidOrders: number
  failedPayments: number
  pendingRefunds: number
  totalRefunded: number
  
  // Recent Activity
  recentOrders: DashboardOrder[]
  recentRefunds: DashboardRefund[]
  recentInventoryChanges: InventoryChange[]
  recentOrderNotes: OrderNote[]
  
  // Top Performers
  topSellingProducts: TopProduct[]
  topCustomers: TopCustomer[]
  topBrands: TopBrand[]
  topCategories: TopCategory[]
  
  // Charts
  revenueChart: RevenueChartData[]
  orderSourceStats: OrderSourceStat[]
  paymentProviderStats: PaymentProviderStat[]
  
  // Reviews
  totalReviews: number
  averageRating: number
  recentReviews: DashboardReview[]
  
  // Coupons
  activeCoupons: number
  expiringSoonCoupons: ExpiringCoupon[]
  
  // Additional Metrics
  averageOrderValue: number
  conversionRate: number
  refundRate: number
}

export interface OrderStatusCount {
  status: string
  _count: { id: number }
}

export interface DashboardOrder {
  id: string
  orderNumber: string
  total: number
  status: string
  paymentStatus: string
  source: string
  createdAt: Date
  user: {
    name: string | null
    email: string
    image: string | null
  }
  _count: {
    notes: number
    refunds: number
  }
}

export interface DashboardRefund {
  id: string
  amount: number
  status: string
  reason: string | null
  createdAt: Date
  order: {
    orderNumber: string
  }
  requestedByUser: {
    name: string | null
  }
}

export interface InventoryChange {
  id: string
  changeAmount: number
  newStock: number
  reason: string
  createdAt: Date
  product: {
    name: string
    images: string[]
  }
  variant: {
    name: string
  } | null
}

export interface OrderNote {
  id: string
  content: string
  isInternal: boolean
  createdAt: Date
  order: {
    orderNumber: string
  }
  author: {
    name: string | null
  }
}

export interface TopProduct {
  id: string
  name: string
  price: number
  images: string[]
  stock: number
  totalSold: number
  totalRevenue: number
  brand: { name: string } | null
  category: { name: string } | null
}

export interface TopCustomer {
  id: string
  name: string | null
  email: string
  image: string | null
  totalSpent: number
  totalOrders: number
}

export interface TopBrand {
  id: string
  name: string
  logo: string | null
  productCount: number
  totalSales: number
}

export interface TopCategory {
  id: string
  name: string
  image: string | null
  productCount: number
  totalSales: number
}

export interface RevenueChartData {
  date: string
  revenue: number
}

export interface OrderSourceStat {
  source: string
  _count: { id: number }
}

export interface PaymentProviderStat {
  paymentProvider: string
  _count: { id: number }
}

export interface DashboardReview {
  id: string
  rating: number
  comment: string | null
  createdAt: Date
  user: {
    name: string | null
    image: string | null
  }
  product: {
    name: string
  }
}

export interface ExpiringCoupon {
  code: string
  expiresAt: Date
  usedCount: number
  maxUses: number | null
}

export interface CriticalAlert {
  type: string
  count: number
  title: string
  description: string
  href: string
  color: 'yellow' | 'orange' | 'purple' | 'blue' | 'red'
  icon: any
}

// Utility functions
export const getAlertColorClasses = (color: CriticalAlert['color']) => ({
  border: {
    yellow: 'border-yellow-200',
    orange: 'border-orange-200',
    purple: 'border-purple-200',
    blue: 'border-blue-200',
    red: 'border-red-200'
  }[color],
  bg: {
    yellow: 'bg-yellow-50 hover:bg-yellow-100',
    orange: 'bg-orange-50 hover:bg-orange-100',
    purple: 'bg-purple-50 hover:bg-purple-100',
    blue: 'bg-blue-50 hover:bg-blue-100',
    red: 'bg-red-50 hover:bg-red-100'
  }[color],
  icon: {
    yellow: 'text-yellow-600',
    orange: 'text-orange-600',
    purple: 'text-purple-600',
    blue: 'text-blue-600',
    red: 'text-red-600'
  }[color],
  text: {
    yellow: 'text-yellow-800',
    orange: 'text-orange-800',
    purple: 'text-purple-800',
    blue: 'text-blue-800',
    red: 'text-red-800'
  }[color],
  subtext: {
    yellow: 'text-yellow-600',
    orange: 'text-orange-600',
    purple: 'text-purple-600',
    blue: 'text-blue-600',
    red: 'text-red-600'
  }[color]
})