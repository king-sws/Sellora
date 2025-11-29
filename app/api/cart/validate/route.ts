// app/api/cart/validate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { 
  validateCart, 
  applyCartAdjustments, 
  removeInvalidCartItems 
} from '@/lib/cart-validation'

/**
 * POST /api/cart/validate - Validate cart before checkout
 * Options:
 * - autoFix: Automatically adjust quantities and remove invalid items
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { autoFix = false } = body

    // Validate cart
    const validation = await validateCart(session.user.id)

    let appliedAdjustments = 0
    let removedItems = 0

    // Apply fixes if requested
    if (autoFix) {
      // Apply quantity adjustments
      if (validation.adjustments.length > 0) {
        const adjustResult = await applyCartAdjustments(validation.adjustments)
        appliedAdjustments = adjustResult.applied
      }

      // Remove invalid items
      if (validation.errors.length > 0) {
        const removeResult = await removeInvalidCartItems(validation.errors)
        removedItems = removeResult.removed
      }
    }

    return NextResponse.json({
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      adjustments: validation.adjustments,
      fixed: autoFix ? {
        adjustmentsApplied: appliedAdjustments,
        itemsRemoved: removedItems
      } : undefined
    })
  } catch (error) {
    console.error('Error validating cart:', error)
    return NextResponse.json(
      { error: 'Failed to validate cart' },
      { status: 500 }
    )
  }
}