/**
 * rate-limit.ts
 * Rate limiting using @upstash/ratelimit with Upstash Redis.
 *
 * Uses sliding window algorithm — the most accurate for abuse prevention.
 * Applied in middleware.ts for all routes and in individual API routes
 * for per-action limits.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Lazily initialised Redis client — avoids connection on import
let redis: Redis | null = null
let rateLimiters: Record<string, Ratelimit> | null = null

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required')
    }

    redis = new Redis({ url, token })
  }
  return redis
}

function getRateLimiters(): Record<string, Ratelimit> {
  if (!rateLimiters) {
    const r = getRedis()

    rateLimiters = {
      // Auth endpoints — strict limits to prevent brute force
      login: new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(5, '15 m'),
        prefix: 'eclat:rl:login',
        analytics: true,
      }),

      signup: new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(3, '1 h'),
        prefix: 'eclat:rl:signup',
        analytics: true,
      }),

      forgotPassword: new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(3, '1 h'),
        prefix: 'eclat:rl:forgot-password',
        analytics: true,
      }),

      // User actions
      messaging: new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(60, '1 m'),
        prefix: 'eclat:rl:messaging',
        analytics: true,
      }),

      likes: new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(100, '1 h'),
        prefix: 'eclat:rl:likes',
        analytics: true,
      }),

      photoUpload: new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(20, '1 h'),
        prefix: 'eclat:rl:photo-upload',
        analytics: true,
      }),

      checkoutSession: new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(10, '1 h'),
        prefix: 'eclat:rl:checkout',
        analytics: true,
      }),

      // General API rate limit
      general: new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(300, '1 m'),
        prefix: 'eclat:rl:general',
        analytics: true,
      }),

      // Admin — higher limit for legitimate admin activity
      admin: new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(200, '15 m'),
        prefix: 'eclat:rl:admin',
        analytics: true,
      }),
    }
  }
  return rateLimiters
}

export type RateLimitKey = keyof ReturnType<typeof getRateLimiters>

/**
 * Checks rate limit for a given key and identifier.
 * Returns null if limit not exceeded, or a 429 NextResponse if exceeded.
 *
 * @param key - Which rate limit rule to apply
 * @param identifier - Unique identifier (IP address or userId)
 */
export async function checkRateLimit(
  key: RateLimitKey,
  identifier: string
): Promise<NextResponse | null> {
  try {
    const limiter = getRateLimiters()[key]
    const { success, limit, remaining, reset } = await limiter.limit(identifier)

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    return null
  } catch (error) {
    // If Redis is unavailable, fail open (don't block users)
    // Log the error but allow the request through
    console.error('[rate-limit] Redis unavailable:', error instanceof Error ? error.message : 'unknown')
    return null
  }
}

/**
 * Gets the client identifier for rate limiting.
 * Uses userId for authenticated requests, IP for unauthenticated.
 */
export function getRateLimitIdentifier(request: NextRequest, userId?: string): string {
  if (userId) return `user:${userId}`

  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0].trim() ?? request.headers.get('x-real-ip') ?? 'unknown'
  return `ip:${ip}`
}
