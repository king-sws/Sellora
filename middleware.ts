// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Get session cookie (lightweight - no imports!)
  const sessionToken = request.cookies.get(
    process.env.NODE_ENV === 'production'
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token'
  )

  const isLoggedIn = !!sessionToken

  // Redirect logged-in users away from auth pages
  if ((pathname === '/auth/sign-in' || pathname === '/auth/sign-up') && isLoggedIn) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Redirect non-logged-in users from protected pages
  if (pathname.startsWith('/dashboard') && !isLoggedIn) {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url))
  }

  // Protect API routes (basic check)
  if (pathname.startsWith('/api/admin') && !isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/auth/sign-in',
    '/auth/sign-up',
    '/dashboard/:path*',
    '/api/admin/:path*',
    '/api/checkout/:path*',    // ← Add these
    '/api/orders/:path*',       // ← Add these
    '/api/profile/:path*',      // ← Add these
  ]
}