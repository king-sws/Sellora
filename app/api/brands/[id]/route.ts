// app/api/brands/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'

/**
 * GET /api/brands/[id] - Get single brand with products
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = request.nextUrl
    const includeProducts = searchParams.get('includeProducts') !== 'false'

    const brand = await prisma.brand.findUnique({
      where: { id: params.id },
      include: {
        ...(includeProducts && {
          products: {
            where: { isActive: true, deletedAt: null },
            take: 20,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              images: true,
              stock: true,
              isFeatured: true
            }
          }
        }),
        _count: {
          select: {
            products: true
          }
        }
      }
    })

    if (!brand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(brand)
  } catch (error) {
    console.error('Error fetching brand:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch brand',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/brands/[id] - Update brand
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
        
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    const data = await request.json()

    // Validate brand exists
    const existingBrand = await prisma.brand.findUnique({
      where: { id: params.id }
    })

    if (!existingBrand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      )
    }

    // Validate name if provided
    if (data.name && (data.name.length < 2 || data.name.length > 100)) {
      return NextResponse.json(
        { error: 'Brand name must be between 2 and 100 characters' },
        { status: 400 }
      )
    }

    // Validate website URL if provided
    if (data.website) {
      try {
        new URL(data.website)
      } catch {
        return NextResponse.json(
          { error: 'Invalid website URL format' },
          { status: 400 }
        )
      }
    }

    // Check for duplicate slug if slug is being changed
    if (data.slug && data.slug !== existingBrand.slug) {
      const slugExists = await prisma.brand.findUnique({
        where: { slug: data.slug }
      })

      if (slugExists) {
        return NextResponse.json(
          { error: 'A brand with this slug already exists' },
          { status: 400 }
        )
      }
    }

    // Update brand
    const brand = await prisma.brand.update({
      where: { id: params.id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.slug && { slug: data.slug }),
        ...(data.logo !== undefined && { logo: data.logo || null }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.website !== undefined && { website: data.website || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    })

    return NextResponse.json({
      ...brand,
      message: 'Brand updated successfully'
    })

  } catch (error) {
    console.error('Error updating brand:', error)
        
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const field = (error.meta?.target as string[])?.[0] || 'field'
        return NextResponse.json(
          { error: `A brand with this ${field} already exists` },
          { status: 400 }
        )
      }
      
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Brand not found' },
          { status: 404 }
        )
      }
    }
        
    return NextResponse.json(
      { 
        error: 'Failed to update brand',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/brands/[id] - Delete brand (only if no products)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
        
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    // Check if brand exists and has products
    const brand = await prisma.brand.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            products: true
          }
        }
      }
    })

    if (!brand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      )
    }

    if (brand._count.products > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete brand with ${brand._count.products} products. Please reassign or delete the products first.`,
          productsCount: brand._count.products
        },
        { status: 400 }
      )
    }

    // Delete brand
    await prisma.brand.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ 
      message: 'Brand deleted successfully',
      brandName: brand.name
    })

  } catch (error) {
    console.error('Error deleting brand:', error)
        
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Brand not found' },
          { status: 404 }
        )
      }
    }
        
    return NextResponse.json(
      { 
        error: 'Failed to delete brand',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}