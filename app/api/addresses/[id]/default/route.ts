// // app/api/addresses/[id]/default/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'

// PATCH /api/addresses/[id]/default - Set address as default
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params before accessing properties
    const { id } = await params

    // Verify the address exists and belongs to the user
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: id,
        userId: session.user.id
      }
    })

    if (!existingAddress) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // First, set all user's addresses to not default
      await tx.address.updateMany({
        where: { 
          userId: session.user.id 
        },
        data: { isDefault: false }
      })

      // Then set the specific address as default
      await tx.address.update({
        where: { id: id },
        data: { isDefault: true }
      })
    })

    return NextResponse.json({ message: 'Default address updated successfully' })
  } catch (error) {
    console.error('Error setting default address:', error)
    return NextResponse.json({ error: 'Failed to set default address' }, { status: 500 })
  }
}

// Updated app/api/addresses/route.ts - POST method fix
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Check if this is the user's first address - make it default automatically
    const addressCount = await prisma.address.count({
      where: { userId: session.user.id }
    })

    const isFirstAddress = addressCount === 0
    const shouldBeDefault = data.isDefault || isFirstAddress

    let address

    if (shouldBeDefault) {
      // Use transaction to ensure atomicity
      address = await prisma.$transaction(async (tx) => {
        // Remove default from other addresses if setting this as default
        await tx.address.updateMany({
          where: { userId: session.user.id },
          data: { isDefault: false }
        })

        // Create the new address
        return await tx.address.create({
          data: {
            ...data,
            userId: session.user.id,
            isDefault: true
          }
        })
      })
    } else {
      // Create address without default
      address = await prisma.address.create({
        data: {
          ...data,
          userId: session.user.id,
          isDefault: false
        }
      })
    }

    return NextResponse.json(address, { status: 201 })
  } catch (error) {
    console.error('Error creating address:', error)
    return NextResponse.json({ error: 'Failed to create address' }, { status: 500 })
  }
}

// Updated app/api/addresses/[id]/route.ts - PUT method fix
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Verify ownership
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingAddress) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    let address

    if (data.isDefault) {
      // Use transaction for atomicity
      address = await prisma.$transaction(async (tx) => {
        // Remove default from other addresses
        await tx.address.updateMany({
          where: { 
            userId: session.user.id,
            id: { not: params.id }
          },
          data: { isDefault: false }
        })

        // Update the current address
        return await tx.address.update({
          where: { id: params.id },
          data: { ...data, isDefault: true }
        })
      })
    } else {
      // Just update the address normally
      address = await prisma.address.update({
        where: { id: params.id },
        data
      })
    }

    return NextResponse.json(address)
  } catch (error) {
    console.error('Error updating address:', error)
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
  }
}