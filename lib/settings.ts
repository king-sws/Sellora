/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/settings.ts - Helper functions for using settings
import { prisma } from '@/db/prisma'

export async function getPublicSettings() {
  const settings = await prisma.storeSetting.findMany({
    where: { isPublic: true },
    select: { key: true, value: true, type: true }
  })

  return settings.reduce((acc, setting) => {
    let value = setting.value
    try {
      if (setting.type === 'JSON' && value) {
        value = JSON.parse(value)
      } else if (setting.type === 'BOOLEAN') {
        value = String(value === 'true')
        } else if (setting.type === 'NUMBER' && value) {
          value = parseFloat(value).toString()
        }
    } catch (e) {
      // Keep original value
    }
    
    acc[setting.key] = value
    return acc
  }, {} as any)
}

export async function getSetting(key: string, defaultValue?: any) {
  const setting = await prisma.storeSetting.findUnique({
    where: { key }
  })

  if (!setting?.value) return defaultValue

  try {
    if (setting.type === 'JSON') {
      return JSON.parse(setting.value)
    } else if (setting.type === 'BOOLEAN') {
      return setting.value === 'true'
    } else if (setting.type === 'NUMBER') {
      return parseFloat(setting.value)
    }
    return setting.value
  } catch (e) {
    return defaultValue
  }
}

export async function updateSetting(key: string, value: any, type: string = 'STRING') {
  let stringValue = value
  if (typeof value === 'object' && value !== null) {
    stringValue = JSON.stringify(value)
  } else if (typeof value === 'boolean' || typeof value === 'number') {
    stringValue = value.toString()
  }

  return await prisma.storeSetting.upsert({
    where: { key },
    create: { key, value: stringValue, type: type as any, category: 'GENERAL' },
    update: { value: stringValue, updatedAt: new Date() }
  })
}