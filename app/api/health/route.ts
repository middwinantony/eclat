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
  try {
    // Check database connectivity
    await db.$queryRaw`SELECT 1`

    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      },
      { status: 200 }
    )
  } catch (_error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Database unavailable',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
