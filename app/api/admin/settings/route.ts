/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/admin/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'
import { auth } from '@/auth'
import { z } from 'zod'
import { SettingType, SettingCategory } from '@prisma/client'

// Validation schemas
const settingUpdateSchema = z.object({
  value: z.any(),
  type: z.nativeEnum(SettingType),
  category: z.nativeEnum(SettingCategory),
  description: z.string().optional(),
  isPublic: z.boolean().default(false)
})

const bulkUpdateSchema = z.record(z.string(), settingUpdateSchema)

interface SettingValue {
  value: any
  type: SettingType
  category: SettingCategory
  description?: string | null
  isPublic: boolean
}

// Type-safe value parsing
function parseSettingValue(value: string | null, type: SettingType): any {
  if (!value) return getDefaultValue(type)
  
  try {
    switch (type) {
      case 'BOOLEAN':
        return value === 'true'
      case 'NUMBER':
        const num = parseFloat(value)
        return isNaN(num) ? 0 : num
      case 'JSON':
        return JSON.parse(value)
      case 'STRING':
      case 'EMAIL':
      case 'IMAGE':
      default:
        return value
    }
  } catch (error) {
    console.warn(`Failed to parse setting value: ${value} as ${type}`, error)
    return getDefaultValue(type)
  }
}

// Type-safe value serialization
function serializeSettingValue(value: any, type: SettingType): string {
  if (value === null || value === undefined) return ''
  
  switch (type) {
    case 'BOOLEAN':
      return Boolean(value).toString()
    case 'NUMBER':
      return Number(value).toString()
    case 'JSON':
      return typeof value === 'string' ? value : JSON.stringify(value)
    case 'STRING':
    case 'EMAIL':
    case 'IMAGE':
    default:
      return String(value)
  }
}

function getDefaultValue(type: SettingType): any {
  switch (type) {
    case 'BOOLEAN': return false
    case 'NUMBER': return 0
    case 'JSON': return {}
    case 'STRING':
    case 'EMAIL':
    case 'IMAGE':
    default: return ''
  }
}

async function checkAdminAuth() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function GET(request: NextRequest) {
  try {
    const session = await checkAdminAuth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as SettingCategory | null
    const isPublic = searchParams.get('public') === 'true'
    const keys = searchParams.get('keys')?.split(',').filter(Boolean)

    // Build where clause
    const where: any = {}
    if (category && Object.values(SettingCategory).includes(category)) {
      where.category = category
    }
    if (isPublic !== undefined) {
      where.isPublic = isPublic
    }
    if (keys && keys.length > 0) {
      where.key = { in: keys }
    }

    const settings = await prisma.storeSetting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }]
    })

    // Convert to structured response
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = {
        value: parseSettingValue(setting.value, setting.type),
        type: setting.type,
        category: setting.category,
        description: setting.description,
        isPublic: setting.isPublic
      }
      return acc
    }, {} as Record<string, SettingValue>)

    return NextResponse.json({
      success: true,
      data: settingsObject,
      meta: {
        total: settings.length,
        categories: [...new Set(settings.map(s => s.category))],
        lastUpdated: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch settings',
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await checkAdminAuth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request body
    const parseResult = bulkUpdateSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: parseResult.error.issues
      }, { status: 400 })
    }

    const settings = parseResult.data
    const timestamp = new Date()

    // Validate individual settings
    const validationErrors: Array<{ key: string; error: string }> = []
    
    for (const [key, data] of Object.entries(settings)) {
      // Key validation
      if (!key || key.length > 100) {
        validationErrors.push({ key, error: 'Invalid key length' })
        continue
      }

      // Type-specific validation
      if (data.type === 'EMAIL' && data.value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(String(data.value))) {
          validationErrors.push({ key, error: 'Invalid email format' })
        }
      }

      if (data.type === 'NUMBER' && isNaN(Number(data.value))) {
        validationErrors.push({ key, error: 'Invalid number format' })
      }

      if (data.type === 'JSON' && data.value) {
        try {
          if (typeof data.value === 'string') {
            JSON.parse(data.value)
          }
        } catch {
          validationErrors.push({ key, error: 'Invalid JSON format' })
        }
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationErrors
      }, { status: 400 })
    }

    // Batch update with transaction
    const results = await prisma.$transaction(async (tx) => {
      const updatePromises = Object.entries(settings).map(async ([key, data]) => {
        const serializedValue = serializeSettingValue(data.value, data.type)
        
        return tx.storeSetting.upsert({
          where: { key },
          create: {
            key,
            value: serializedValue,
            type: data.type,
            category: data.category,
            description: data.description,
            isPublic: data.isPublic,
            createdAt: timestamp,
            updatedAt: timestamp
          },
          update: {
            value: serializedValue,
            type: data.type,
            category: data.category,
            description: data.description,
            isPublic: data.isPublic,
            updatedAt: timestamp
          }
        })
      })

      return Promise.all(updatePromises)
    })

    return NextResponse.json({ 
      success: true,
      message: `Updated ${results.length} settings successfully`,
      meta: {
        updated: results.length,
        timestamp: timestamp.toISOString()
      }
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ 
      error: 'Failed to update settings',
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await checkAdminAuth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const keys = searchParams.get('keys')?.split(',').filter(Boolean)

    if (!keys || keys.length === 0) {
      return NextResponse.json({ error: 'No keys specified' }, { status: 400 })
    }

    const deleted = await prisma.storeSetting.deleteMany({
      where: {
        key: { in: keys }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleted.count} settings`,
      meta: {
        deleted: deleted.count
      }
    })
  } catch (error) {
    console.error('Error deleting settings:', error)
    return NextResponse.json({ 
      error: 'Failed to delete settings',
    }, { status: 500 })
  }
}