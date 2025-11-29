// ============================================
// app/api/addresses/temporary/route.ts
// ============================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'
import { z } from 'zod'

// Validation schema for temporary addresses
const tempAddressSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  address1: z.string().min(1, 'Address is required').max(200),
  address2: z.string().max(200).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  zipCode: z.string().min(1, 'ZIP code is required').max(20),
  country: z.string().min(1, 'Country is required').max(100),
  phone: z.string().max(20).optional()
})

/**
 * POST /api/addresses/temporary
 * Creates a temporary address for one-time use during checkout
 * 
 * Note: Since the schema doesn't have an 'isTemporary' field,
 * this creates a regular address that won't be set as default.
 * The frontend should handle not displaying it in the address list
 * or you can delete it after the order is created.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const validationResult = tempAddressSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.flatten().fieldErrors 
        }, 
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Create temporary address
    // We create it as a regular address but never set it as default
    // This way it can be used for the order but won't clutter the user's address book
    const address = await prisma.address.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        company: null,
        address1: data.address1,
        address2: data.address2 || null,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
        phone: data.phone || null,
        userId: session.user.id,
        isDefault: false // Never set temporary addresses as default
      }
    })

    return NextResponse.json(address, { status: 201 })
  } catch (error) {
    console.error('Error creating temporary address:', error)
    return NextResponse.json(
      { error: 'Failed to create temporary address' }, 
      { status: 500 }
    )
  }
}