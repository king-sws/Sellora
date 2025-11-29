// // app/api/admin/product-image-styles/route.ts

// import { auth } from '@/auth'
// import { prisma } from '@/db/prisma'
// import { NextRequest, NextResponse } from 'next/server'


// // GET - Retrieve all product image styles
// export async function GET(request: NextRequest) {
//   try {
//     // Optional: Check if user is admin
//     // const session = await getServerSession(authOptions)
//     // if (!session?.user?.isAdmin) {
//     //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     // }

//     // Fetch from database
//     const styles = await prisma.productImageStyle.findMany({
//       select: {
//         productId: true,
//         style: true,
//       },
//     })

//     // Convert to object format
//     const stylesMap = styles.reduce((acc, item) => {
//       acc[item.productId] = item.style as 'cover' | 'contain'
//       return acc
//     }, {} as Record<string, 'cover' | 'contain'>)

//     return NextResponse.json({ styles: stylesMap })
//   } catch (error) {
//     console.error('Error fetching image styles:', error)
//     return NextResponse.json({ styles: {} })
//   }
// }

// // POST - Save product image styles
// export async function POST(request: NextRequest) {
//   try {
//     // Check if user is admin
//     const session = await auth()
//     if (!session?.user?.isAdmin) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }

//     const body = await request.json()
//     const { styles } = body

//     if (!styles || typeof styles !== 'object') {
//       return NextResponse.json({ error: 'Invalid styles data' }, { status: 400 })
//     }

//     // Use transaction to update all styles
//     await prisma.$transaction(
//       Object.entries(styles).map(([productId, style]) =>
//         prisma.productImageStyle.upsert({
//           where: { productId },
//           update: { style: style as string },
//           create: {
//             productId,
//             style: style as string,
//           },
//         })
//       )
//     )

//     return NextResponse.json({ success: true })
//   } catch (error) {
//     console.error('Error saving image styles:', error)
//     return NextResponse.json({ error: 'Failed to save styles' }, { status: 500 })
//   }
// }

// // ============================================
// // ALTERNATIVE: Using JSON file storage instead of database
// // ============================================

// /*
// import { promises as fs } from 'fs'
// import path from 'path'

// const STYLES_FILE = path.join(process.cwd(), 'data', 'product-image-styles.json')

// // Ensure data directory exists
// async function ensureDataDir() {
//   const dir = path.dirname(STYLES_FILE)
//   try {
//     await fs.access(dir)
//   } catch {
//     await fs.mkdir(dir, { recursive: true })
//   }
// }

// export async function GET(request: NextRequest) {
//   try {
//     await ensureDataDir()
//     const data = await fs.readFile(STYLES_FILE, 'utf-8')
//     const styles = JSON.parse(data)
//     return NextResponse.json({ styles })
//   } catch (error) {
//     // File doesn't exist or is empty, return empty object
//     return NextResponse.json({ styles: {} })
//   }
// }

// export async function POST(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions)
//     if (!session?.user?.isAdmin) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//     }

//     const body = await request.json()
//     const { styles } = body

//     await ensureDataDir()
//     await fs.writeFile(STYLES_FILE, JSON.stringify(styles, null, 2))

//     return NextResponse.json({ success: true })
//   } catch (error) {
//     console.error('Error saving image styles:', error)
//     return NextResponse.json({ error: 'Failed to save styles' }, { status: 500 })
//   }
// }
// */