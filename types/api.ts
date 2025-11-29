// types/api.ts - Type definitions for API routes
import { Prisma } from '@prisma/client'

// Product query filters
export interface ProductFilters {
  page?: number
  limit?: number
  category?: string
  brand?: string
  search?: string
  featured?: boolean
  stock?: 'low' | 'out' | 'in' | 'all'
  sortBy?: 'createdAt' | 'price' | 'name' | 'salesCount' | 'viewCount' | 'stock'
  sortOrder?: 'asc' | 'desc'
  includeInactive?: boolean
  minPrice?: number
  maxPrice?: number
  tags?: string[]
}

// Build where clause with proper typing
export function buildProductWhereClause(filters: ProductFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    deletedAt: null
  }

  // Only show active products by default
  if (!filters.includeInactive) {
    where.isActive = true
  }

  // Category filter
  if (filters.category) {
    where.category = { slug: filters.category }
  }

  // Brand filter
  if (filters.brand) {
    where.brand = { slug: filters.brand }
  }

  // Search across multiple fields
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { sku: { contains: filters.search, mode: 'insensitive' } },
      { tags: { has: filters.search } }
    ]
  }

  // Featured filter
  if (filters.featured) {
    where.isFeatured = true
  }

  // Stock filtering
  if (filters.stock === 'low') {
    where.stock = { gt: 0, lte: 10 }
  } else if (filters.stock === 'out') {
    where.stock = 0
  } else if (filters.stock === 'in') {
    where.stock = { gt: 0 }
  }

  // Price range filter
  if (filters.minPrice || filters.maxPrice) {
    where.price = {}
    if (filters.minPrice) where.price.gte = filters.minPrice
    if (filters.maxPrice) where.price.lte = filters.maxPrice
  }

  // Tags filter
  if (filters.tags && filters.tags.length > 0) {
    where.tags = { hasSome: filters.tags }
  }

  return where
}

// Build orderBy with proper typing
export function buildProductOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.ProductOrderByWithRelationInput {
  const order = (sortOrder || 'desc') as 'asc' | 'desc'
  
  switch (sortBy) {
    case 'stock':
      return { stock: order }
    case 'price':
      return { price: order }
    case 'name':
      return { name: order }
    case 'salesCount':
      return { salesCount: order }
    case 'viewCount':
      return { viewCount: order }
    default:
      return { createdAt: order }
  }
}

// Inventory update data
export interface InventoryUpdateData {
  stock: number
  inventoryReason?: 'SALE' | 'RETURN' | 'ADJUSTMENT_MANUAL' | 'RECEIVING' | 'CANCELLATION'
  inventoryNotes?: string
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  meta?: Record<string, unknown>
}