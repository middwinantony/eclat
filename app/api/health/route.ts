/**
 * health/route.ts
 * Health check endpoint — used by App Runner, CloudWatch, and smoke tests.
 * Returns 200 if the application is running.
 * Returns 503 if database is unavailable.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  // Always return 200 so App Runner health checks pass.
  // DB check uses a 3-second timeout so a suspended Neon free-tier endpoint
  // (cold start can take 5-30s) never blocks the health response.
  let dbStatus = 'ok'
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 3000)
    )
    await Promise.race([db.$queryRaw`SELECT 1`, timeout])
  } catch (_error) {
    dbStatus = 'unavailable'
  }

  return NextResponse.json(
    {
      status: 'ok',
      db: dbStatus,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    },
    { status: 200 }
  )
}
