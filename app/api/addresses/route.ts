// ============================================
// app/api/addresses/route.ts
// ============================================
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

// GET /api/addresses - Get user's addresses
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const addresses = await prisma.address.findMany({
      where: { userId: session.user.id },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(addresses)
  } catch (error) {
    console.error('Error fetching addresses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch addresses' }, 
      { status: 500 }
    )
  }
}

// POST /api/addresses - Create new address
export async function POST(request: NextRequest) {
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

    // Check if this is the user's first address
    const addressCount = await prisma.address.count({
      where: { userId: session.user.id }
    })

    const isFirstAddress = addressCount === 0
    const shouldBeDefault = data.isDefault || isFirstAddress

    // Create address with transaction for consistency
    const address = await prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        // Remove default from other addresses
        await tx.address.updateMany({
          where: { userId: session.user.id },
          data: { isDefault: false }
        })
      }

      // Create the new address
      return await tx.address.create({
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
          userId: session.user.id,
          isDefault: shouldBeDefault
        }
      })
    })

    return NextResponse.json(address, { status: 201 })
  } catch (error) {
    console.error('Error creating address:', error)
    return NextResponse.json(
      { error: 'Failed to create address' }, 
      { status: 500 }
    )
  }
}





// // ============================================
// // app/api/addresses/route.ts - Enhanced Version
// // ============================================
// import { NextRequest, NextResponse } from 'next/server'
// import { prisma } from '@/db/prisma'
// import { auth } from '@/auth'
// import { z } from 'zod'
// import { Prisma } from '@prisma/client'

// // ============================================
// // TYPE DEFINITIONS
// // ============================================

// interface AddressResponse {
//   id: string
//   firstName: string
//   lastName: string
//   company?: string | null
//   address1: string
//   address2?: string | null
//   city: string
//   state: string
//   zipCode: string
//   country: string
//   phone?: string | null
//   isDefault: boolean
//   createdAt: Date
//   updatedAt: Date
// }

// interface PaginatedResponse<T> {
//   data: T[]
//   pagination: {
//     page: number
//     limit: number
//     total: number
//     pages: number
//     hasNext: boolean
//     hasPrev: boolean
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

// const addressSchema = z.object({
//   firstName: z.string()
//     .min(1, 'First name is required')
//     .max(50, 'First name must be less than 50 characters')
//     .trim(),
//   lastName: z.string()
//     .min(1, 'Last name is required')
//     .max(50, 'Last name must be less than 50 characters')
//     .trim(),
//   company: z.string()
//     .max(100, 'Company name must be less than 100 characters')
//     .trim()
//     .optional()
//     .nullable(),
//   address1: z.string()
//     .min(1, 'Address is required')
//     .max(200, 'Address must be less than 200 characters')
//     .trim(),
//   address2: z.string()
//     .max(200, 'Address line 2 must be less than 200 characters')
//     .trim()
//     .optional()
//     .nullable(),
//   city: z.string()
//     .min(1, 'City is required')
//     .max(100, 'City must be less than 100 characters')
//     .trim(),
//   state: z.string()
//     .min(1, 'State is required')
//     .max(100, 'State must be less than 100 characters')
//     .trim(),
//   zipCode: z.string()
//     .min(1, 'ZIP code is required')
//     .max(20, 'ZIP code must be less than 20 characters')
//     .trim()
//     .regex(/^[a-zA-Z0-9\s-]+$/, 'Invalid ZIP code format'),
//   country: z.string()
//     .min(1, 'Country is required')
//     .max(100, 'Country must be less than 100 characters')
//     .trim(),
//   phone: z.string()
//     .max(20, 'Phone must be less than 20 characters')
//     .trim()
//     .regex(/^[+]?[(]?[0-9\s().-]*$/, 'Invalid phone number format')
//     .optional()
//     .nullable(),
//   isDefault: z.boolean().optional().default(false)
// })

// const querySchema = z.object({
//   page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1)).optional().default('1'),
//   limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(100)).optional().default('20'),
//   search: z.string().optional(),
//   country: z.string().optional(),
//   isDefault: z.enum(['true', 'false']).optional(),
//   sortBy: z.enum(['createdAt', 'updatedAt', 'firstName', 'city']).optional().default('createdAt'),
//   sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
// })

// // ============================================
// // HELPER FUNCTIONS
// // ============================================

// /**
//  * Creates a standardized error response
//  */
// function createErrorResponse(
//   error: string,
//   status: number,
//   details?: unknown,
//   code?: string
// ): NextResponse<ErrorResponse> {
//   return NextResponse.json(
//     { 
//       error, 
//       ...(details && { details }),
//       ...(code && { code })
//     },
//     { status }
//   )
// }

// /**
//  * Validates user session
//  */
// async function validateSession() {
//   const session = await auth()
  
//   if (!session?.user?.id) {
//     throw new Error('UNAUTHORIZED')
//   }
  
//   return session
// }

// /**
//  * Builds where clause for address queries
//  */
// function buildWhereClause(
//   userId: string,
//   filters: {
//     search?: string
//     country?: string
//     isDefault?: string
//   }
// ): Prisma.AddressWhereInput {
//   const where: Prisma.AddressWhereInput = { userId }

//   if (filters.search) {
//     const searchTerm = filters.search.trim()
//     where.OR = [
//       { firstName: { contains: searchTerm, mode: 'insensitive' } },
//       { lastName: { contains: searchTerm, mode: 'insensitive' } },
//       { company: { contains: searchTerm, mode: 'insensitive' } },
//       { address1: { contains: searchTerm, mode: 'insensitive' } },
//       { address2: { contains: searchTerm, mode: 'insensitive' } },
//       { city: { contains: searchTerm, mode: 'insensitive' } },
//       { state: { contains: searchTerm, mode: 'insensitive' } },
//       { zipCode: { contains: searchTerm, mode: 'insensitive' } }
//     ]
//   }

//   if (filters.country) {
//     where.country = { equals: filters.country, mode: 'insensitive' }
//   }

//   if (filters.isDefault) {
//     where.isDefault = filters.isDefault === 'true'
//   }

//   return where
// }

// /**
//  * Optimized address selection
//  */
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
// // GET /api/addresses - Get user's addresses
// // ============================================
// export async function GET(request: NextRequest): Promise<NextResponse> {
//   try {
//     // Validate session
//     const session = await validateSession()

//     // Parse and validate query parameters
//     const searchParams = request.nextUrl.searchParams
//     const queryResult = querySchema.safeParse({
//       page: searchParams.get('page') || '1',
//       limit: searchParams.get('limit') || '20',
//       search: searchParams.get('search') || undefined,
//       country: searchParams.get('country') || undefined,
//       isDefault: searchParams.get('isDefault') || undefined,
//       sortBy: searchParams.get('sortBy') || 'createdAt',
//       sortOrder: searchParams.get('sortOrder') || 'desc'
//     })

//     if (!queryResult.success) {
//       return createErrorResponse(
//         'Invalid query parameters',
//         400,
//         queryResult.error.flatten().fieldErrors
//       )
//     }

//     const { page, limit, search, country, isDefault, sortBy, sortOrder } = queryResult.data
//     const skip = (page - 1) * limit

//     // Build where clause
//     const where = buildWhereClause(session.user.id, { search, country, isDefault })

//     // Build order by clause
//     const orderBy: Prisma.AddressOrderByWithRelationInput = {
//       ...(sortBy === 'firstName' || sortBy === 'city' 
//         ? { [sortBy]: sortOrder }
//         : { isDefault: 'desc', [sortBy]: sortOrder }
//       )
//     }

//     // Execute queries in parallel for better performance
//     const [addresses, total] = await Promise.all([
//       prisma.address.findMany({
//         where,
//         select: addressSelect,
//         orderBy,
//         skip,
//         take: limit
//       }),
//       prisma.address.count({ where })
//     ])

//     // Calculate pagination metadata
//     const pages = Math.ceil(total / limit)

//     const response: PaginatedResponse<AddressResponse> = {
//       data: addresses,
//       pagination: {
//         page,
//         limit,
//         total,
//         pages,
//         hasNext: page < pages,
//         hasPrev: page > 1
//       }
//     }

//     return NextResponse.json(response, {
//       headers: {
//         'Cache-Control': 'private, no-cache, no-store, must-revalidate',
//         'X-Total-Count': total.toString(),
//         'X-Page': page.toString(),
//         'X-Pages': pages.toString()
//       }
//     })
//   } catch (error) {
//     console.error('Error fetching addresses:', error)

//     if (error instanceof Error && error.message === 'UNAUTHORIZED') {
//       return createErrorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED')
//     }

//     return createErrorResponse(
//       'Failed to fetch addresses',
//       500,
//       process.env.NODE_ENV === 'development' ? error : undefined
//     )
//   }
// }

// // ============================================
// // POST /api/addresses - Create new address
// // ============================================
// export async function POST(request: NextRequest): Promise<NextResponse> {
//   try {
//     // Validate session
//     const session = await validateSession()

//     // Parse request body
//     let body: unknown
//     try {
//       body = await request.json()
//     } catch {
//       return createErrorResponse('Invalid JSON in request body', 400)
//     }

//     // Validate input
//     const validationResult = addressSchema.safeParse(body)
//     if (!validationResult.success) {
//       return createErrorResponse(
//         'Validation failed',
//         400,
//         validationResult.error.flatten().fieldErrors,
//         'VALIDATION_ERROR'
//       )
//     }

//     const data = validationResult.data

//     // Check address limit (optional: prevent spam)
//     const addressCount = await prisma.address.count({
//       where: { userId: session.user.id }
//     })

//     if (addressCount >= 10) {
//       return createErrorResponse(
//         'Maximum number of addresses (10) reached',
//         400,
//         undefined,
//         'ADDRESS_LIMIT_REACHED'
//       )
//     }

//     const isFirstAddress = addressCount === 0
//     const shouldBeDefault = data.isDefault || isFirstAddress

//     // Create address with transaction for consistency
//     const address = await prisma.$transaction(
//       async (tx) => {
//         // If this should be default, remove default from other addresses
//         if (shouldBeDefault) {
//           await tx.address.updateMany({
//             where: { 
//               userId: session.user.id,
//               isDefault: true
//             },
//             data: { isDefault: false }
//           })
//         }

//         // Create the new address
//         return await tx.address.create({
//           data: {
//             firstName: data.firstName,
//             lastName: data.lastName,
//             company: data.company || null,
//             address1: data.address1,
//             address2: data.address2 || null,
//             city: data.city,
//             state: data.state,
//             zipCode: data.zipCode,
//             country: data.country,
//             phone: data.phone || null,
//             userId: session.user.id,
//             isDefault: shouldBeDefault
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

//     return NextResponse.json(address, { 
//       status: 201,
//       headers: {
//         'Cache-Control': 'no-store'
//       }
//     })
//   } catch (error) {
//     console.error('Error creating address:', error)

//     if (error instanceof Error && error.message === 'UNAUTHORIZED') {
//       return createErrorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED')
//     }

//     if (error instanceof Prisma.PrismaClientKnownRequestError) {
//       if (error.code === 'P2002') {
//         return createErrorResponse(
//           'Address already exists',
//           409,
//           undefined,
//           'DUPLICATE_ADDRESS'
//         )
//       }
//     }

//     return createErrorResponse(
//       'Failed to create address',
//       500,
//       process.env.NODE_ENV === 'development' ? error : undefined
//     )
//   }
// }

// // ============================================
// // DELETE /api/addresses - Bulk delete addresses
// // ============================================
// export async function DELETE(request: NextRequest): Promise<NextResponse> {
//   try {
//     // Validate session
//     const session = await validateSession()

//     // Parse request body
//     let body: unknown
//     try {
//       body = await request.json()
//     } catch {
//       return createErrorResponse('Invalid JSON in request body', 400)
//     }

//     // Validate input
//     const deleteSchema = z.object({
//       ids: z.array(z.string().cuid()).min(1, 'At least one address ID is required')
//     })

//     const validationResult = deleteSchema.safeParse(body)
//     if (!validationResult.success) {
//       return createErrorResponse(
//         'Validation failed',
//         400,
//         validationResult.error.flatten().fieldErrors
//       )
//     }

//     const { ids } = validationResult.data

//     // Delete addresses (only user's own addresses)
//     const result = await prisma.address.deleteMany({
//       where: {
//         id: { in: ids },
//         userId: session.user.id
//       }
//     })

//     if (result.count === 0) {
//       return createErrorResponse(
//         'No addresses found to delete',
//         404,
//         undefined,
//         'NOT_FOUND'
//       )
//     }

//     return NextResponse.json({
//       message: 'Addresses deleted successfully',
//       deletedCount: result.count
//     })
//   } catch (error) {
//     console.error('Error deleting addresses:', error)

//     if (error instanceof Error && error.message === 'UNAUTHORIZED') {
//       return createErrorResponse('Unauthorized', 401, undefined, 'UNAUTHORIZED')
//     }

//     return createErrorResponse(
//       'Failed to delete addresses',
//       500,
//       process.env.NODE_ENV === 'development' ? error : undefined
//     )
//   }
// }