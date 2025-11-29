// ============================================
// FILE 3: app/api/admin/coupons/[id]/duplicate/route.ts
// NEW: Duplicate coupon with new code
// ============================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'
import { z } from 'zod'

const duplicateSchema = z.object({
  newCode: z.string().min(1).regex(/^[A-Z0-9_-]+$/i, 'Invalid code format'),
  adjustments: z.object({
    description: z.string().optional(),
    startsAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),
    maxUses: z.number().int().positive().optional()
  }).optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = duplicateSchema.parse(body)
    const { newCode, adjustments } = validated

    // Get original coupon
    const original = await prisma.coupon.findUnique({
      where: { id: params.id }
    })

    if (!original || original.deletedAt) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }

    // Check if new code already exists
    const existing = await prisma.coupon.findFirst({
      where: { 
        code: newCode.toUpperCase(),
        deletedAt: null
      }
    })

    if (existing) {
      return NextResponse.json({ 
        error: 'A coupon with this code already exists' 
      }, { status: 400 })
    }

    // Create duplicate
    const duplicated = await prisma.coupon.create({
      data: {
        code: newCode.toUpperCase(),
        description: adjustments?.description ?? original.description,
        type: original.type,
        value: original.value,
        minAmount: original.minAmount,
        maxUses: adjustments?.maxUses ?? original.maxUses,
        maxUsesPerUser: original.maxUsesPerUser,
        isActive: original.isActive,
        startsAt: adjustments?.startsAt ? new Date(adjustments.startsAt) : original.startsAt,
        expiresAt: adjustments?.expiresAt ? new Date(adjustments.expiresAt) : original.expiresAt,
        usedCount: 0 // Reset usage count
      }
    })

    return NextResponse.json({
      success: true,
      coupon: duplicated,
      message: `Coupon duplicated successfully as ${duplicated.code}`
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }
    
    console.error('Error duplicating coupon:', error)
    return NextResponse.json({ 
      error: 'Failed to duplicate coupon',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
