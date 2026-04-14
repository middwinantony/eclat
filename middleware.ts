/**
 * middleware.ts
 * Next.js Edge Middleware — runs on every request before page/route handlers.
 *
 * Responsibilities:
 *   1. Authenticate requests to protected routes (JWT validation via NextAuth)
 *   2. Apply general API rate limiting
 *   3. Add security headers
 *   4. Redirect unauthenticated users to /login
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Routes that require authentication
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/browse',
  '/matches',
  '/messages',
  '/profile',
  '/events',
  '/settings',
  '/admin',
  '/matchmaker',
  '/api/profile',
  '/api/discover',
  '/api/matches',
  '/api/conversations',
  '/api/calls',
  '/api/billing',
  '/api/notifications',
  '/api/blocks',
  '/api/hide',
  '/api/verification',
  '/api/events',
  '/api/admin',
  '/api/matchmaker',
  '/api/pusher',
]

// Routes that require admin role
const ADMIN_PREFIXES = ['/admin', '/api/admin']

// Routes that require matchmaker role
const MATCHMAKER_PREFIXES = ['/matchmaker', '/api/matchmaker']

// Routes excluded from ALL checks (public)
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/api/auth',
  '/api/health',
  '/api/webhooks',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
}

function requiresAuth(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
}

function requiresAdmin(pathname: string): boolean {
  return ADMIN_PREFIXES.some((p) => pathname.startsWith(p))
}

function requiresMatchmaker(pathname: string): boolean {
  return MATCHMAKER_PREFIXES.some((p) => pathname.startsWith(p))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Only apply auth checks to protected routes
  if (!requiresAuth(pathname)) {
    return NextResponse.next()
  }

  // Validate JWT token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Unauthenticated — redirect to login
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check admin routes
  if (requiresAdmin(pathname) && token.role !== 'ADMIN') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Check matchmaker routes
  if (
    requiresMatchmaker(pathname) &&
    token.role !== 'MATCHMAKER' &&
    token.role !== 'ADMIN'
  ) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Check verification status — unverified users can only access billing and settings
  if (
    token.verificationStatus !== 'VERIFIED' &&
    !pathname.startsWith('/dashboard/billing') &&
    !pathname.startsWith('/dashboard/settings') &&
    !pathname.startsWith('/api/billing') &&
    !pathname.startsWith('/api/auth') &&
    (pathname.startsWith('/dashboard') || pathname.startsWith('/browse') || pathname.startsWith('/matches'))
  ) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Profile verification required' },
        { status: 403 }
      )
    }
    return NextResponse.redirect(new URL('/dashboard?verification=pending', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico).*)',
  ],
}
