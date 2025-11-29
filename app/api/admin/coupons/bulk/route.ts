// ============================================
// FILE 2: app/api/admin/coupons/bulk/route.ts
// NEW: Bulk operations for coupons
// ============================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'
import { z } from 'zod'

const bulkActionSchema = z.object({
  action: z.enum(['activate', 'deactivate', 'delete', 'extend']),
  couponIds: z.array(z.string()).min(1, 'At least one coupon ID required'),
  data: z.object({
    expiresAt: z.string().datetime().optional()
  }).optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = bulkActionSchema.parse(body)
    const { action, couponIds, data } = validated

    let result
    const timestamp = new Date()

    switch (action) {
      case 'activate':
        result = await prisma.coupon.updateMany({
          where: { 
            id: { in: couponIds },
            deletedAt: null 
          },
          data: { 
            isActive: true,
            updatedAt: timestamp
          }
        })
        break

      case 'deactivate':
        result = await prisma.coupon.updateMany({
          where: { 
            id: { in: couponIds },
            deletedAt: null 
          },
          data: { 
            isActive: false,
            updatedAt: timestamp
          }
        })
        break

      case 'delete':
        result = await prisma.coupon.updateMany({
          where: { 
            id: { in: couponIds },
            deletedAt: null 
          },
          data: { 
            deletedAt: timestamp,
            isActive: false,
            updatedAt: timestamp
          }
        })
        break

      case 'extend':
        if (!data?.expiresAt) {
          return NextResponse.json({ 
            error: 'expiresAt is required for extend action' 
          }, { status: 400 })
        }
        
        result = await prisma.coupon.updateMany({
          where: { 
            id: { in: couponIds },
            deletedAt: null 
          },
          data: { 
            expiresAt: new Date(data.expiresAt),
            updatedAt: timestamp
          }
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      action,
      affectedCount: result.count,
      message: `Successfully ${action}d ${result.count} coupon(s)`
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }
    
    console.error('Error in bulk coupon operation:', error)
    return NextResponse.json({ 
      error: 'Bulk operation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}