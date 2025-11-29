// app/api/analytics/products/route.ts
import { auth } from "@/auth"
import { prisma } from "@/db/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30'
    
    const daysAgo = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysAgo)

    // Product performance
    const productPerformance = await prisma.$queryRaw`
      SELECT 
        p."id",
        p."name",
        p."slug",
        p."price",
        p."stock",
        p."images",
        c."name" as category,
        COALESCE(SUM(oi."quantity"), 0)::int as sold,
        COALESCE(SUM(oi."quantity" * oi."price"), 0)::float as revenue,
        COUNT(DISTINCT o."id")::int as orders,
        COALESCE(AVG(r."rating"), 0)::float as rating,
        COUNT(r."id")::int as reviews
      FROM "Product" p
      LEFT JOIN "Category" c ON p."categoryId" = c."id"
      LEFT JOIN "OrderItem" oi ON p."id" = oi."productId"
      LEFT JOIN "Order" o ON oi."orderId" = o."id" AND o."paymentStatus" = 'PAID' AND o."createdAt" >= ${startDate}
      LEFT JOIN "Review" r ON p."id" = r."productId"
      WHERE p."deletedAt" IS NULL
      GROUP BY p."id", p."name", p."slug", p."price", p."stock", p."images", c."name"
      ORDER BY sold DESC
    `

    // Low performing products (low sales, high stock)
    const lowPerformingProducts = await prisma.$queryRaw`
      SELECT 
        p."id",
        p."name",
        p."slug",
        p."price",
        p."stock",
        p."createdAt",
        COALESCE(SUM(oi."quantity"), 0)::int as sold,
        c."name" as category
      FROM "Product" p
      LEFT JOIN "Category" c ON p."categoryId" = c."id"
      LEFT JOIN "OrderItem" oi ON p."id" = oi."productId"
      LEFT JOIN "Order" o ON oi."orderId" = o."id" AND o."paymentStatus" = 'PAID'
      WHERE p."deletedAt" IS NULL 
        AND p."stock" > 10
        AND p."createdAt" < ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
      GROUP BY p."id", p."name", p."slug", p."price", p."stock", p."createdAt", c."name"
      HAVING COALESCE(SUM(oi."quantity"), 0) < 5
      ORDER BY p."stock" DESC, sold ASC
      LIMIT 20
    `

    return NextResponse.json({
      productPerformance,
      lowPerformingProducts
    })

  } catch (error) {
    console.error('Error fetching product analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch product analytics' }, { status: 500 })
  }
}