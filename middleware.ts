/**
 * middleware.ts
 * Next.js Edge Middleware — runs on every request before page/route handlers.
 *
 * Uses NextAuth v5's auth() callback (backed by the edge-safe authConfig)
 * so JWT verification works correctly with v5's encrypted tokens.
 *
 * Responsibilities:
 *   1. Authenticate requests to protected routes
 *   2. Redirect unauthenticated users to /login
 *   3. Enforce role-based access (admin, matchmaker)
 *   4. Enforce verification status restrictions
 */

import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import type { NextAuthRequest } from "next-auth"
import { authConfig } from "@/lib/auth.config"

const { auth } = NextAuth(authConfig)

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

const ADMIN_PREFIXES      = ['/admin',      '/api/admin']
const MATCHMAKER_PREFIXES = ['/matchmaker', '/api/matchmaker']

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
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
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

export default auth(async (req: NextAuthRequest) => {
  const { pathname } = req.nextUrl

  // Skip middleware for public paths
  if (isPublicPath(pathname)) return NextResponse.next()

  // Admin API routes with a valid X-Admin-Key bypass session auth
  if (pathname.startsWith('/api/admin')) {
    const adminKey = req.headers.get('x-admin-key')
    if (adminKey && adminKey === process.env.ADMIN_SECRET_KEY) {
      return NextResponse.next()
    }
  }

  // Only apply auth checks to protected routes
  if (!requiresAuth(pathname)) return NextResponse.next()

  const session = req.auth

  // Unauthenticated — redirect to login
  if (!session?.user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check admin routes
  if (requiresAdmin(pathname) && session.user.role !== 'ADMIN') {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Check matchmaker routes
  if (
    requiresMatchmaker(pathname) &&
    session.user.role !== 'MATCHMAKER' &&
    session.user.role !== 'ADMIN'
  ) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Check verification status — unverified users can only access billing and settings
  if (
    session.user.verificationStatus !== 'VERIFIED' &&
    !pathname.startsWith('/dashboard/billing') &&
    !pathname.startsWith('/dashboard/settings') &&
    !pathname.startsWith('/api/billing') &&
    !pathname.startsWith('/api/auth') &&
    (pathname.startsWith('/dashboard') || pathname.startsWith('/browse') || pathname.startsWith('/matches'))
  ) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Profile verification required' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/dashboard?verification=pending', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Exclude NextAuth's own API routes — middleware must never intercept them.
    // When auth() wraps the middleware and runs on /api/auth/callback/*, it
    // interferes with PKCE cookie handling and causes "Invalid code verifier".
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico|api/auth).*)',
  ],
}
