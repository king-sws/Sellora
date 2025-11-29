/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/addresses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'
import { z } from 'zod'


// Validation schema
const addressSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  company: z.string().max(100).optional().nullable(),
  address1: z.string().min(1, 'Address is required').max(200),
  address2: z.string().max(200).optional().nullable(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  zipCode: z.string().min(1, 'ZIP code is required').max(20),
  country: z.string().min(1, 'Country is required').max(100),
  phone: z.string().max(20).optional().nullable(),
  isDefault: z.boolean().optional()
})

// ============================================
// app/api/addresses/[id]/route.ts
// ============================================

// GET /api/addresses/[id] - Get single address
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const address = await prisma.address.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!address) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    return NextResponse.json(address)
  } catch (error) {
    console.error('Error fetching address:', error)
    return NextResponse.json(
      { error: 'Failed to fetch address' }, 
      { status: 500 }
    )
  }
}

// PUT /api/addresses/[id] - Update address
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate input
    const validationResult = addressSchema.safeParse(body)
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

    // Update with transaction if setting as default
    const address = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        // Remove default from other addresses
        await tx.address.updateMany({
          where: { 
            userId: session.user.id,
            id: { not: params.id }
          },
          data: { isDefault: false }
        })
      }

      // Update the address
      return await tx.address.update({
        where: { id: params.id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          company: data.company,
          address1: data.address1,
          address2: data.address2,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          country: data.country,
          phone: data.phone,
          isDefault: data.isDefault ?? existingAddress.isDefault
        }
      })
    })

    return NextResponse.json(address)
  } catch (error) {
    console.error('Error updating address:', error)
    return NextResponse.json(
      { error: 'Failed to update address' }, 
      { status: 500 }
    )
  }
}

// DELETE /api/addresses/[id] - Delete address
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use transaction to handle default address reassignment
    const result = await prisma.$transaction(async (tx) => {
      // Check if address exists and belongs to user
      const addressToDelete = await tx.address.findFirst({
        where: {
          id: params.id,
          userId: session.user.id
        }
      })

      if (!addressToDelete) {
        throw new Error('Address not found')
      }

      const wasDefault = addressToDelete.isDefault

      // Delete the address
      await tx.address.delete({
        where: { id: params.id }
      })

      // If deleted address was default, set another as default
      if (wasDefault) {
        const remainingAddresses = await tx.address.findFirst({
          where: { userId: session.user.id },
          orderBy: { createdAt: 'desc' }
        })

        if (remainingAddresses) {
          await tx.address.update({
            where: { id: remainingAddresses.id },
            data: { isDefault: true }
          })
        }
      }

      return { success: true }
    })

    return NextResponse.json({ message: 'Address deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting address:', error)
    
    if (error.message === 'Address not found') {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to delete address' }, 
      { status: 500 }
    )
  }
}

// ============================================
// app/api/addresses/[id]/default/route.ts
// ============================================

// PATCH /api/addresses/[id]/default - Set address as default
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the address exists and belongs to the user
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingAddress) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    // Use transaction to ensure atomicity
    const updatedAddress = await prisma.$transaction(async (tx) => {
      // Remove default from all user's addresses
      await tx.address.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false }
      })

      // Set the specific address as default
      return await tx.address.update({
        where: { id: params.id },
        data: { isDefault: true }
      })
    })

    return NextResponse.json({
      message: 'Default address updated successfully',
      address: updatedAddress
    })
  } catch (error) {
    console.error('Error setting default address:', error)
    return NextResponse.json(
      { error: 'Failed to set default address' }, 
      { status: 500 }
    )
  }
}


// // ============================================
// // app/api/addresses/[id]/route.ts
// // ============================================
// import { NextRequest, NextResponse } from 'next/server'
// import { prisma } from '@/db/prisma'
// import { auth } from '@/auth'
// import { z } from 'zod'
// import { Prisma } from '@prisma/client'

// // ============================================
// // TYPE DEFINITIONS
// // ============================================

// interface RouteParams {
//   params: {
//     id: string
//   }
// }

// interface ErrorResponse {
//   error: string
//   details?: unknown
//   code?: string
// }

// // ============================================
// // VALIDATION SCHEMAS
// // ============================================

// const updateAddressSchema = z.object({
//   firstName: z.string()
//     .min(1, 'First name is required')
//     .max(50, 'First name must be less than 50 characters')
//     .trim()
//     .optional(),
//   lastName: z.string()
//     .min(1, 'Last name is required')
//     .max(50, 'Last name must be less than 50 characters')
//     .trim()
//     .optional(),
//   company: z.string()
//     .max(100, 'Company name must be less than 100 characters')
//     .trim()
//     .optional()
//     .nullable(),
//   address1: z.string()
//     .min(1, 'Address is required')
//     .max(200, 'Address must be less than 200 characters')
//     .trim()
//     .optional(),
//   address2: z.string()
//     .max(200, 'Address line 2 must be less than 200 characters')
//     .trim()
//     .optional()
//     .nullable(),
//   city: z.string()
//     .min(1, 'City is required')
//     .max(100, 'City must be less than 100 characters')
//     .trim()
//     .optional(),
//   state: z.string()
//     .min(1, 'State is required')
//     .max(100, 'State must be less than 100 characters')
//     .trim()
//     .optional(),
//   zipCode: z.string()
//     .min(1, 'ZIP code is required')
//     .max(20, 'ZIP code must be less than 20 characters')
//     .trim()
//     .regex(/^[a-zA-Z0-9\s-]+$/, 'Invalid ZIP code format')
//     .optional(),
//   country: z.string()
//     .min(1, 'Country is required')
//     .max(100, 'Country must be less than 100 characters')
//     .trim()
//     .optional(),
//   phone: z.string()
//     .max(20, 'Phone must be less than 20 characters')
//     .trim()
//     .regex(/^[+]?[(]?[0-9\s().-]*$/, 'Invalid phone number format')
//     .optional()
//     .nullable(),
//   isDefault: z.boolean().optional()
// }).refine(
//   (data) => Object.keys(data).length > 0,
//   { message: 'At least one field must be provided for update' }
// )

// // ============================================
// // HELPER FUNCTIONS
// // ============================================

// function createErrorResponse(
//   error: string,
//   status: number,
//   details?: unknown,
//   code?: string
// ): NextResponse<ErrorResponse> {
//   return NextResponse.json(
//     { 
//       error, 
//       ...(code && { code })
//     },
//     { status }
//   )
// }

// async function validateSession() {
//   const session = await auth()
  
//   if (!session?.user?.id) {
//     throw new Error('UNAUTHORIZED')
//   }
  
//   return session
// }

// const addressSelect = {
//   id: true,
//   firstName: true,
//   lastName: true,
//   company: true,
//   address1: true,
//   address2: true,
//   city: true,
//   state: true,
//   zipCode: true,
//   country: true,
//   phone: true,
//   isDefault: true,
//   createdAt: true,
//   updatedAt: true
// } satisfies Prisma.AddressSelect

// // ============================================
// // GET /api/addresses/[id] - Get single address
// // ============================================
// export async function GET(
//   request: NextRequest,
//   { params }: RouteParams
// ): Promise<NextResponse> {
//   try {
//     const session = await validateSession()
//     const { id } = params

//     // Validate ID format
//     if (!id || typeof id !== 'string') {
//       return createErrorResponse('Invalid address ID', 400, undefined, 'INVALID_ID')
//     }

//     const address = await prisma.address.findFirst({
//       where: {
//         id,
//         userId: session.user.id
//       },
//       select: addressSelect
//     })

//     if (!address) {
//       return createErrorResponse(
//         'Address not found',
//         404,
//         undefined,
//         'NOT_FOUND'
//       )
//     }

//     return NextResponse.json(address, {
//       headers: {
//         'Cache-Control': 'private, no-cache, no-store, must-revalidate'
//       }
//     })
//   } catch (error) {
//     console.error('Error fetching address:', error)

//     if (error instanceof Error && error.message === 'UNAUTHORIZED') {
//       return createErrorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED')
//     }

//     return createErrorResponse(
//       'Failed to fetch address',
//       500,
//       process.env.NODE_ENV === 'development' ? error : undefined
//     )
//   }
// }

// // ============================================
// // PATCH /api/addresses/[id] - Update address
// // ============================================
// export async function PATCH(
//   request: NextRequest,
//   { params }: RouteParams
// ): Promise<NextResponse> {
//   try {
//     const session = await validateSession()
//     const { id } = params

//     // Validate ID format
//     if (!id || typeof id !== 'string') {
//       return createErrorResponse('Invalid address ID', 400, undefined, 'INVALID_ID')
//     }

//     // Parse request body
//     let body: unknown
//     try {
//       body = await request.json()
//     } catch {
//       return createErrorResponse('Invalid JSON in request body', 400)
//     }

//     // Validate input
//     const validationResult = updateAddressSchema.safeParse(body)
//     if (!validationResult.success) {
//       return createErrorResponse(
//         'Validation failed',
//         400,
//         validationResult.error.flatten().fieldErrors,
//         'VALIDATION_ERROR'
//       )
//     }

//     const data = validationResult.data

//     // Check if address exists and belongs to user
//     const existingAddress = await prisma.address.findFirst({
//       where: {
//         id,
//         userId: session.user.id
//       }
//     })

//     if (!existingAddress) {
//       return createErrorResponse(
//         'Address not found',
//         404,
//         undefined,
//         'NOT_FOUND'
//       )
//     }

//     // Update address with transaction
//     const updatedAddress = await prisma.$transaction(
//       async (tx) => {
//         // If setting as default, remove default from other addresses
//         if (data.isDefault === true) {
//           await tx.address.updateMany({
//             where: {
//               userId: session.user.id,
//               id: { not: id },
//               isDefault: true
//             },
//             data: { isDefault: false }
//           })
//         }

//         // Update the address
//         return await tx.address.update({
//           where: { id },
//           data: {
//             ...(data.firstName && { firstName: data.firstName }),
//             ...(data.lastName && { lastName: data.lastName }),
//             ...(data.company !== undefined && { company: data.company }),
//             ...(data.address1 && { address1: data.address1 }),
//             ...(data.address2 !== undefined && { address2: data.address2 }),
//             ...(data.city && { city: data.city }),
//             ...(data.state && { state: data.state }),
//             ...(data.zipCode && { zipCode: data.zipCode }),
//             ...(data.country && { country: data.country }),
//             ...(data.phone !== undefined && { phone: data.phone }),
//             ...(data.isDefault !== undefined && { isDefault: data.isDefault })
//           },
//           select: addressSelect
//         })
//       },
//       {
//         maxWait: 5000,
//         timeout: 10000,
//         isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
//       }
//     )

//     return NextResponse.json(updatedAddress, {
//       headers: {
//         'Cache-Control': 'no-store'
//       }
//     })
//   } catch (error) {
//     console.error('Error updating address:', error)

//     if (error instanceof Error && error.message === 'UNAUTHORIZED') {
//       return createErrorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED')
//     }

//     if (error instanceof Prisma.PrismaClientKnownRequestError) {
//       if (error.code === 'P2025') {
//         return createErrorResponse(
//           'Address not found',
//           404,
//           undefined,
//           'NOT_FOUND'
//         )
//       }
//     }

//     return createErrorResponse(
//       'Failed to update address',
//       500,
//       process.env.NODE_ENV === 'development' ? error : undefined
//     )
//   }
// }

// // ============================================
// // DELETE /api/addresses/[id] - Delete address
// // ============================================
// export async function DELETE(
//   request: NextRequest,
//   { params }: RouteParams
// ): Promise<NextResponse> {
//   try {
//     const session = await validateSession()
//     const { id } = params

//     // Validate ID format
//     if (!id || typeof id !== 'string') {
//       return createErrorResponse('Invalid address ID', 400, undefined, 'INVALID_ID')
//     }

//     // Check if address exists and belongs to user
//     const existingAddress = await prisma.address.findFirst({
//       where: {
//         id,
//         userId: session.user.id
//       }
//     })

//     if (!existingAddress) {
//       return createErrorResponse(
//         'Address not found',
//         404,
//         undefined,
//         'NOT_FOUND'
//       )
//     }

//     // Prevent deleting the last address if it's being used in orders
//     const ordersUsingAddress = await prisma.order.count({
//       where: {
//         shippingAddressId: id,
//         userId: session.user.id
//       }
//     })

//     if (ordersUsingAddress > 0) {
//       return createErrorResponse(
//         `Cannot delete address: it is used in ${ordersUsingAddress} order(s)`,
//         400,
//         { ordersCount: ordersUsingAddress },
//         'ADDRESS_IN_USE'
//       )
//     }

//     // Delete the address
//     await prisma.address.delete({
//       where: { id }
//     })

//     // If deleted address was default, set another address as default
//     if (existingAddress.isDefault) {
//       const nextAddress = await prisma.address.findFirst({
//         where: { userId: session.user.id },
//         orderBy: { createdAt: 'desc' }
//       })

//       if (nextAddress) {
//         await prisma.address.update({
//           where: { id: nextAddress.id },
//           data: { isDefault: true }
//         })
//       }
//     }

//     return NextResponse.json({
//       message: 'Address deleted successfully'
//     })
//   } catch (error) {
//     console.error('Error deleting address:', error)

//     if (error instanceof Error && error.message === 'UNAUTHORIZED') {
//       return createErrorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED')
//     }

//     if (error instanceof Prisma.PrismaClientKnownRequestError) {
//       if (error.code === 'P2025') {
//         return createErrorResponse(
//           'Address not found',
//           404,
//           undefined,
//           'NOT_FOUND'
//         )
//       }
//     }

//     return createErrorResponse(
//       'Failed to delete address',
//       500,
//       process.env.NODE_ENV === 'development' ? error : undefined
//     )
//   }
// }