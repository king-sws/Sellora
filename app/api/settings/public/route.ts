// app/api/settings/public/route.ts - Public settings for frontend
import { NextResponse } from 'next/server'
import { prisma } from '@/db/prisma'

export async function GET() {
  try {
    const settings = await prisma.storeSetting.findMany({
      where: { isPublic: true },
      select: {
        key: true,
        value: true,
        type: true
      }
    })

    const settingsObject = settings.reduce((acc, setting) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let value: any = setting.value
      try {
        if (setting.type === 'JSON' && value) {
          value = JSON.parse(value)
        } else if (setting.type === 'BOOLEAN') {
          value = value === 'true'
        } else if (setting.type === 'NUMBER' && value) {
          value = parseFloat(value)
        }
      } catch (e) {
        // Keep original value if parsing fails
      }
      
      acc[setting.key] = value
      return acc
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }, {} as any)

    return NextResponse.json(settingsObject)
  } catch (error) {
    console.error('Error fetching public settings:', error)
    return NextResponse.json({}, { status: 200 }) // Return empty object on error
  }
}