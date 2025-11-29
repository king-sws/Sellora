// app/api/admin/profile/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get admin user details with additional statistics
    const [adminUser, orderStats, recentActivity] = await Promise.all([
      // Get user details
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          // Get user's order management stats
          _count: {
            select: {
              OrderStatusHistory: true,
              OrderNote: true,
              Refund: true
            }
          }
        }
      }),

      // Get order management statistics for this admin
      prisma.order.aggregate({
        _count: { id: true },
        _sum: { total: true },
        where: {
          OR: [
            {
              statusHistory: {
                some: {
                  changedBy: session.user.id
                }
              }
            },
            {
              notes: {
                some: {
                  authorId: session.user.id
                }
              }
            }
          ]
        }
      }),

      // Get recent activity (last 10 actions by this admin)
      prisma.orderStatusHistory.findMany({
        where: {
          changedBy: session.user.id
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              user: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 10
      })
    ])

    if (!adminUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Calculate additional metrics
    const today = new Date()
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    
    const [todayActions, thisMonthActions, totalCustomersManaged] = await Promise.all([
      // Actions today
      prisma.orderStatusHistory.count({
        where: {
          changedBy: session.user.id,
          timestamp: { gte: startOfToday }
        }
      }),

      // Actions this month
      prisma.orderStatusHistory.count({
        where: {
          changedBy: session.user.id,
          timestamp: { 
            gte: new Date(today.getFullYear(), today.getMonth(), 1)
          }
        }
      }),

      // Unique customers this admin has helped
      prisma.order.findMany({
        where: {
          statusHistory: {
            some: {
              changedBy: session.user.id
            }
          }
        },
        select: {
          userId: true
        },
        distinct: ['userId']
      })
    ])

    const profileData = {
      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        image: adminUser.image,
        role: adminUser.role,
        joinDate: adminUser.createdAt,
        lastUpdated: adminUser.updatedAt
      },
      statistics: {
        totalOrdersManaged: orderStats._count.id || 0,
        totalRevenueManaged: orderStats._sum.total || 0,
        totalStatusChanges: adminUser._count.OrderStatusHistory,
        totalOrderNotes: adminUser._count.OrderNote,
        totalRefundsProcessed: adminUser._count.Refund,
        actionsToday: todayActions,
        actionsThisMonth: thisMonthActions,
        customersHelped: totalCustomersManaged.length
      },
      recentActivity: recentActivity.map(activity => ({
        id: activity.id,
        action: `Changed order ${activity.order.orderNumber} from ${activity.fromStatus} to ${activity.toStatus}`,
        orderNumber: activity.order.orderNumber,
        customerName: activity.order.user.name,
        fromStatus: activity.fromStatus,
        toStatus: activity.toStatus,
        timestamp: activity.timestamp,
        reason: activity.reason
      }))
    }

    return NextResponse.json(profileData)
  } catch (error) {
    console.error('Error fetching admin profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile data' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, currentPassword, newPassword } = body

    // If changing password, verify current password
    if (newPassword && currentPassword) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { password: true }
      })

      if (!user?.password) {
        return NextResponse.json({ error: 'No password set for this user' }, { status: 400 })
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password)
      if (!isValidPassword) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }
    }

    // Prepare update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {}
    
    if (name && name !== session.user.name) {
      updateData.name = name
    }
    
    if (email && email !== session.user.email) {
      // Check if email is already taken
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true }
      })
      
      if (existingUser && existingUser.id !== session.user.id) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
      }
      
      updateData.email = email
    }
    
    if (newPassword) {
      updateData.password = await bcrypt.hash(newPassword, 12)
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        updatedAt: true
      }
    })

    return NextResponse.json({ 
      success: true, 
      user: updatedUser,
      message: 'Profile updated successfully'
    })
  } catch (error) {
    console.error('Error updating admin profile:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}