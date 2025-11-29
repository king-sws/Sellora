// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'

// ==================== ROUTE DEFINITIONS ====================

// Public routes - accessible to everyone
const publicRoutes = [
  '/',
  '/products',
  '/about',
  '/contact',
  '/support',
  '/terms',
  '/privacy',
  '/cart',
]

// Auth routes - redirect to home/dashboard if already logged in
const authRoutes = [
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-request',
  '/auth/error', // ADD THIS - allow access to error page
]

// Protected routes - require authentication (regular users)
const protectedRoutes = [
  '/checkout',
  '/account',
  '/orders',
  '/profile',
  '/addresses',
  '/settings',
]

// Admin-only routes - require ADMIN role
const adminRoutes = [
  '/dashboard',
]

// API routes that should be protected
const protectedApiRoutes = [
  '/api/checkout',
  '/api/orders',
  '/api/profile',
  '/api/addresses',
]

// Admin API routes
const adminApiRoutes = [
  '/api/dashboard',
  '/api/admin',
]

// ==================== HELPER FUNCTIONS ====================

function isRouteMatch(pathname: string, routes: string[]): boolean {
  return routes.some(route => {
    if (pathname === route) return true
    if (pathname.startsWith(route + '/')) return true
    return false
  })
}

function shouldSkipMiddleware(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/fonts/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    // ADD: Skip NextAuth callback routes
    pathname.startsWith('/api/auth/') ||
    /\.(jpg|jpeg|png|gif|svg|ico|webp|woff|woff2|ttf|eot)$/.test(pathname)
  )
}

// ==================== MIDDLEWARE FUNCTION ====================

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isApiRoute = pathname.startsWith('/api/')

  try {
    // Skip middleware for static assets, Next.js internals, and NextAuth routes
    if (shouldSkipMiddleware(pathname)) {
      return NextResponse.next()
    }

    // Skip public API routes (like webhooks, public product APIs)
    if (isApiRoute && pathname.startsWith('/api/webhook')) {
      return NextResponse.next()
    }

    // Get session with error handling
    let session
    try {
      session = await auth()
    } catch (authError) {
      console.error('Auth error in middleware:', authError)
      // If auth fails, treat as not authenticated
      session = null
    }

    const isAuthenticated = !!session?.user
    const userRole = session?.user?.role
    const isAdmin = userRole === 'ADMIN'

    // Check route types
    const isPublicRoute = isRouteMatch(pathname, publicRoutes)
    const isAuthRoute = isRouteMatch(pathname, authRoutes)
    const isProtectedRoute = isRouteMatch(pathname, protectedRoutes)
    const isAdminRoute = isRouteMatch(pathname, adminRoutes)
    const isProtectedApi = isRouteMatch(pathname, protectedApiRoutes)
    const isAdminApi = isRouteMatch(pathname, adminApiRoutes)

    // ==================== HANDLE AUTH ROUTES ====================
    // Only redirect away from sign-in/sign-up, NOT from error page
    if (isAuthenticated && (pathname === '/auth/sign-in' || pathname === '/auth/sign-up')) {
      const redirectUrl = isAdmin 
        ? new URL('/dashboard', request.url)
        : new URL('/', request.url)
      return NextResponse.redirect(redirectUrl)
    }

    // ==================== HANDLE ADMIN ROUTES ====================
    if (isAdminRoute || isAdminApi) {
      if (!isAuthenticated) {
        if (isApiRoute) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          )
        }
        const signInUrl = new URL('/auth/sign-in', request.url)
        signInUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(signInUrl)
      }

      if (!isAdmin) {
        if (isApiRoute) {
          return NextResponse.json(
            { error: 'Admin access required' },
            { status: 403 }
          )
        }
        // Redirect non-admin users to home, not error page
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    // ==================== HANDLE PROTECTED ROUTES ====================
    if (isProtectedRoute || isProtectedApi) {
      if (!isAuthenticated) {
        if (isApiRoute) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          )
        }
        const signInUrl = new URL('/auth/sign-in', request.url)
        signInUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(signInUrl)
      }
    }

    // ==================== SECURITY HEADERS ====================
    const response = NextResponse.next()
    
    // Add user info to headers for server components
    if (isAuthenticated && session?.user) {
      response.headers.set('X-User-Id', session.user.id || '')
      response.headers.set('X-User-Role', userRole || 'USER')
    }

    // Security headers
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

    // Strict Transport Security (HSTS) for production
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
      
      // Content Security Policy for production
      const cspDirectives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self' https://api.stripe.com",
        "frame-src 'self' https://js.stripe.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')
      
      response.headers.set('Content-Security-Policy', cspDirectives)
    }

    return response

  } catch (error) {
    console.error('❌ Middleware error:', error)
    
    // Handle errors gracefully
    if (isApiRoute) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }

    // For non-API routes, allow access to public and auth routes
    if (isRouteMatch(pathname, publicRoutes) || isRouteMatch(pathname, authRoutes)) {
      return NextResponse.next()
    }
    
    // For protected routes, redirect to sign-in
    const signInUrl = new URL('/auth/sign-in', request.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }
}

// ==================== MATCHER CONFIG ====================
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml
     * - public folder files
     * - static assets with file extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:jpg|jpeg|png|gif|svg|ico|webp|woff|woff2|ttf|eot)).*)',
  ],
}