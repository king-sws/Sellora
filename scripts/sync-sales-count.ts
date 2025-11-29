// scripts/sync-sales-count.ts
// Run this script to update all products' salesCount from actual orders
// Usage: npx tsx scripts/sync-sales-count.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function syncSalesCount() {
  try {
    console.log('🔄 Starting sales count synchronization...')

    // Get all sales data grouped by product
    const salesData = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          status: {
            in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED']
          }
        }
      },
      _sum: {
        quantity: true
      }
    })

    console.log(`📊 Found sales data for ${salesData.length} products`)

    // Update each product's salesCount
    let updated = 0
    for (const item of salesData) {
      const salesCount = item._sum.quantity || 0
      
      await prisma.product.update({
        where: { id: item.productId },
        data: { salesCount }
      })
      
      updated++
      if (updated % 10 === 0) {
        console.log(`   Updated ${updated}/${salesData.length} products...`)
      }
    }

    // Reset salesCount to 0 for products with no sales
    const productsWithSales = salesData.map(item => item.productId)
    const resetResult = await prisma.product.updateMany({
      where: {
        id: { notIn: productsWithSales },
        salesCount: { gt: 0 }
      },
      data: { salesCount: 0 }
    })

    console.log(`✅ Successfully updated ${updated} products with sales`)
    console.log(`✅ Reset ${resetResult.count} products to 0 sales`)
    
    // Show top 10 best sellers
    const topProducts = await prisma.product.findMany({
      where: {
        salesCount: { gt: 0 }
      },
      orderBy: { salesCount: 'desc' },
      take: 10,
      select: {
        name: true,
        salesCount: true,
        price: true
      }
    })

    console.log('\n🏆 Top 10 Best Sellers:')
    topProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} - ${product.salesCount} sales ($${product.price})`)
    })

  } catch (error) {
    console.error('❌ Error syncing sales count:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

syncSalesCount()
  .then(() => {
    console.log('\n✨ Sync completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Failed to sync:', error)
    process.exit(1)
  })