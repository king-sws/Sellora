
// app/api/admin/refunds/[id]/reject/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'

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
    const { reason } = body

    const refund = await prisma.refund.findUnique({
      where: { id: params.id }
    })

    if (!refund) {
      return NextResponse.json({ error: 'Refund not found' }, { status: 404 })
    }

    if (refund.status !== 'PENDING') {
      return NextResponse.json({ 
        error: 'Only pending refunds can be rejected' 
      }, { status: 400 })
    }

    // Update refund status
    const updatedRefund = await prisma.refund.update({
      where: { id: params.id },
      data: {
        status: 'REJECTED',
        reason: reason || refund.reason
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            total: true,
          }
        }
      }
    })

    return NextResponse.json(updatedRefund)
  } catch (error) {
    console.error('Error rejecting refund:', error)
    return NextResponse.json({ 
      error: 'Failed to reject refund',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
