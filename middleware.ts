// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Only protect API routes in middleware
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  try {
    // ✅ Dynamic import - only loads when API route is hit
    const { auth } = await import('@/auth')
    const session = await auth()
    
    const isLoggedIn = !!session?.user
    const isAdmin = session?.user?.role === 'ADMIN'

    // Admin API routes
    if (pathname.startsWith('/api/admin') || pathname.startsWith('/api/dashboard')) {
      if (!isLoggedIn) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      if (!isAdmin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }
    
    // Protected user API routes
    const protectedApis = ['/api/checkout', '/api/orders', '/api/profile', '/api/addresses']
    if (protectedApis.some(api => pathname.startsWith(api)) && !isLoggedIn) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const response = NextResponse.next()
    
    if (isLoggedIn && session?.user) {
      response.headers.set('X-User-Id', session.user.id || '')
      response.headers.set('X-User-Role', session.user.role || 'USER')
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export const config = {
  matcher: '/api/:path*'
}