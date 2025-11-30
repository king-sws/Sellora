// middleware.ts
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const pathname = nextUrl.pathname
  const isLoggedIn = !!session?.user
  const isAdmin = session?.user?.role === 'ADMIN'

  // ==================== AUTH ROUTES ====================
  // Redirect logged-in users away from sign-in/sign-up
  if ((pathname === '/auth/sign-in' || pathname === '/auth/sign-up') && isLoggedIn) {
    return NextResponse.redirect(new URL(isAdmin ? '/dashboard' : '/', nextUrl))
  }

  // ==================== API PROTECTION ====================
  if (pathname.startsWith('/api/')) {
    // Admin API routes
    if ((pathname.startsWith('/api/admin') || pathname.startsWith('/api/dashboard'))) {
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
  }

  // ==================== ADD USER HEADERS ====================
  const response = NextResponse.next()
  
  if (isLoggedIn && session?.user) {
    response.headers.set('X-User-Id', session.user.id || '')
    response.headers.set('X-User-Role', session.user.role || 'USER')
  }

  return response
})

// ==================== MATCHER CONFIG ====================
// Only run middleware on routes that need auth checks
export const config = {
  matcher: [
    // Auth pages
    '/auth/sign-in',
    '/auth/sign-up',
    // Protected API routes
    '/api/admin/:path*',
    '/api/dashboard/:path*',
    '/api/checkout/:path*',
    '/api/orders/:path*',
    '/api/profile/:path*',
    '/api/addresses/:path*',
  ]
}