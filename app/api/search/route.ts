// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { Prisma } from '@prisma/client'

// =========================================================
// TYPES & CONSTANTS
// =========================================================

interface SearchFilters {
  categoryId?: string
  brandId?: string
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  tags?: string[]
}

interface SearchResult {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  images: string[]
  category: string | null
  brand: string | null
  stock: number
  rating: number | null
  reviewCount: number
  isFeatured: boolean
  tags: string[]
}

const MAX_QUERY_LENGTH = 100
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 50
const CACHE_DURATION = 60 // seconds

// =========================================================
// HELPER FUNCTIONS
// =========================================================

/**
 * Sanitizes and validates the search query
 */
function sanitizeQuery(query: string | null): string | null {
  if (!query || typeof query !== 'string') return null
  
  const trimmed = query.trim()
  if (trimmed.length === 0) return null
  
  // Remove potentially malicious characters but keep spaces and hyphens
  const sanitized = trimmed
    .replace(/[<>{}[\]\\]/g, '')
    .slice(0, MAX_QUERY_LENGTH)
  
  return sanitized.length > 0 ? sanitized : null
}

/**
 * Parses and validates search filters from query params
 */
function parseFilters(searchParams: URLSearchParams): SearchFilters {
  const filters: SearchFilters = {}
  
  // Category filter
  const categoryId = searchParams.get('category')
  if (categoryId) filters.categoryId = categoryId
  
  // Brand filter
  const brandId = searchParams.get('brand')
  if (brandId) filters.brandId = brandId
  
  // Price range
  const minPrice = parseFloat(searchParams.get('minPrice') || '')
  if (!isNaN(minPrice) && minPrice >= 0) filters.minPrice = minPrice
  
  const maxPrice = parseFloat(searchParams.get('maxPrice') || '')
  if (!isNaN(maxPrice) && maxPrice >= 0) filters.maxPrice = maxPrice
  
  // Stock filter
  const inStock = searchParams.get('inStock')
  if (inStock === 'true') filters.inStock = true
  
  // Tags filter
  const tags = searchParams.get('tags')
  if (tags) {
    filters.tags = tags.split(',').map(t => t.trim()).filter(Boolean)
  }
  
  return filters
}

/**
 * Validates and parses the limit parameter
 */
function parseLimit(limitParam: string | null): number {
  const limit = parseInt(limitParam || String(DEFAULT_LIMIT))
  
  if (isNaN(limit) || limit < 1) return DEFAULT_LIMIT
  if (limit > MAX_LIMIT) return MAX_LIMIT
  
  return limit
}

/**
 * Builds the Prisma where clause for search
 */
function buildWhereClause(
  sanitizedQuery: string,
  filters: SearchFilters
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    deletedAt: null,
  }
  
  // Text search conditions
  const searchConditions: Prisma.ProductWhereInput[] = [
    {
      name: {
        contains: sanitizedQuery,
        mode: 'insensitive'
      }
    },
    {
      description: {
        contains: sanitizedQuery,
        mode: 'insensitive'
      }
    }
  ]
  
  // Add SKU search if query looks like a SKU (alphanumeric)
  if (/^[a-z0-9-]+$/i.test(sanitizedQuery)) {
    searchConditions.push({
      sku: {
        contains: sanitizedQuery,
        mode: 'insensitive'
      }
    })
  }
  
  // Add tag search
  searchConditions.push({
    tags: {
      has: sanitizedQuery
    }
  })
  
  where.OR = searchConditions
  
  // Apply filters
  if (filters.categoryId) {
    where.categoryId = filters.categoryId
  }
  
  if (filters.brandId) {
    where.brandId = filters.brandId
  }
  
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {}
    if (filters.minPrice !== undefined) {
      where.price.gte = filters.minPrice
    }
    if (filters.maxPrice !== undefined) {
      where.price.lte = filters.maxPrice
    }
  }
  
  if (filters.inStock) {
    where.stock = { gt: 0 }
  }
  
  if (filters.tags && filters.tags.length > 0) {
    where.tags = {
      hasSome: filters.tags
    }
  }
  
  return where
}

/**
 * Calculates average rating from reviews
 */
async function getProductRatings(productIds: string[]): Promise<Map<string, { rating: number, count: number }>> {
  const ratings = await prisma.review.groupBy({
    by: ['productId'],
    where: {
      productId: { in: productIds }
    },
    _avg: {
      rating: true
    },
    _count: {
      id: true
    }
  })
  
  const ratingsMap = new Map<string, { rating: number, count: number }>()
  
  for (const rating of ratings) {
    ratingsMap.set(rating.productId, {
      rating: rating._avg.rating || 0,
      count: rating._count.id
    })
  }
  
  return ratingsMap
}

/**
 * Tracks search analytics (fire and forget)
 */
async function trackSearchAnalytics(query: string, resultCount: number) {
  // This could be expanded to store search analytics in a dedicated table
  // For now, we'll just log it
  try {
    console.log(`Search: "${query}" - ${resultCount} results`)
    // TODO: Consider implementing search analytics table
    // await prisma.searchAnalytics.create({
    //   data: { query, resultCount, timestamp: new Date() }
    // })
  } catch (error) {
    // Fail silently - don't break search if analytics fails
    console.error('Search analytics error:', error)
  }
}

// =========================================================
// MAIN API HANDLER
// =========================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const sortBy = searchParams.get('sort') || 'relevance' // relevance, price_asc, price_desc, newest, popular
    
    // Validate and sanitize query
    const sanitizedQuery = sanitizeQuery(query)
    
    if (!sanitizedQuery) {
      return NextResponse.json({ 
        results: [],
        query: '',
        count: 0,
        filters: {}
      })
    }
    
    // Parse filters and limit
    const filters = parseFilters(searchParams)
    const limit = parseLimit(searchParams.get('limit'))
    
    // Build where clause
    const where = buildWhereClause(sanitizedQuery, filters)
    
    // Determine sort order
    let orderBy: Prisma.ProductOrderByWithRelationInput[] = []
    
    switch (sortBy) {
      case 'price_asc':
        orderBy = [{ price: 'asc' }]
        break
      case 'price_desc':
        orderBy = [{ price: 'desc' }]
        break
      case 'newest':
        orderBy = [{ createdAt: 'desc' }]
        break
      case 'popular':
        orderBy = [{ salesCount: 'desc' }, { viewCount: 'desc' }]
        break
      case 'relevance':
      default:
        // Prioritize featured products, then by sales, then alphabetically
        orderBy = [
          { isFeatured: 'desc' },
          { salesCount: 'desc' },
          { name: 'asc' }
        ]
        break
    }
    
    // Execute search query
    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        comparePrice: true,
        images: true,
        stock: true,
        isFeatured: true,
        tags: true,
        category: {
          select: {
            name: true
          }
        },
        brand: {
          select: {
            name: true
          }
        }
      },
      orderBy,
      take: limit
    })
    
    // Get ratings for all products
    const productIds = products.map(p => p.id)
    const ratingsMap = await getProductRatings(productIds)
    
    // Transform results
    const results: SearchResult[] = products.map(product => {
      const productRating = ratingsMap.get(product.id)
      
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        comparePrice: product.comparePrice,
        images: product.images,
        category: product.category?.name || null,
        brand: product.brand?.name || null,
        stock: product.stock,
        rating: productRating?.rating || null,
        reviewCount: productRating?.count || 0,
        isFeatured: product.isFeatured,
        tags: product.tags
      }
    })
    
    // Track analytics asynchronously
    trackSearchAnalytics(sanitizedQuery, results.length)
    
    // Build response
    const response = NextResponse.json({ 
      results,
      query: sanitizedQuery,
      count: results.length,
      filters,
      sort: sortBy
    })
    
    // Add cache headers
    response.headers.set(
      'Cache-Control',
      `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=${CACHE_DURATION * 2}`
    )
    
    return response
    
  } catch (error) {
    console.error('Search API error:', error)
    
    // Differentiate between Prisma errors and other errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { 
          error: 'Database query failed', 
          results: [],
          count: 0
        },
        { status: 503 } // Service Unavailable
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        results: [],
        count: 0
      },
      { status: 500 }
    )
  }
}

// =========================================================
// OPTIONAL: POST endpoint for complex searches
// =========================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, filters, sort, limit } = body
    
    // Validate and sanitize
    const sanitizedQuery = sanitizeQuery(query)
    
    if (!sanitizedQuery) {
      return NextResponse.json({ 
        results: [],
        query: '',
        count: 0
      })
    }
    
    // Build search with validated inputs
    const validatedLimit = Math.min(limit || DEFAULT_LIMIT, MAX_LIMIT)
    const where = buildWhereClause(sanitizedQuery, filters || {})
    
    // Execute search (similar to GET)
    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        comparePrice: true,
        images: true,
        stock: true,
        category: { select: { name: true } },
        brand: { select: { name: true } }
      },
      take: validatedLimit
    })
    
    const results = products.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      comparePrice: p.comparePrice,
      images: p.images,
      category: p.category?.name || null,
      brand: p.brand?.name || null,
      stock: p.stock
    }))
    
    return NextResponse.json({ 
      results,
      query: sanitizedQuery,
      count: results.length
    })
    
  } catch (error) {
    console.error('Search POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', results: [] },
      { status: 500 }
    )
  }
}