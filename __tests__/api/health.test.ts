/**
 * Tests for GET /api/health
 * Health endpoint used by App Runner, CloudWatch, and smoke tests.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks (before route imports) ─────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: vi.fn(),
  },
}))

// ── Imports after mocks ───────────────────────────────────────────────────────

import { db }   from "@/lib/db"
import { GET }  from "@/app/api/health/route"

const mockDb = db as unknown as { $queryRaw: ReturnType<typeof vi.fn> }

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 200 with ok status when database is reachable", async () => {
    mockDb.$queryRaw.mockResolvedValue([{ "?column?": 1 }])

    const res  = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.status).toBe("ok")
    expect(body.timestamp).toBeDefined()
    expect(typeof body.timestamp).toBe("string")
  })

  it("returns 200 with db unavailable when database is unreachable", async () => {
    mockDb.$queryRaw.mockRejectedValue(new Error("Connection refused"))

    const res  = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)       // App Runner needs 200 to pass health checks
    expect(body.status).toBe("ok")     // top-level status is always ok
    expect(body.db).toBe("unavailable")
    expect(body.timestamp).toBeDefined()
  })

  it("includes timestamp in ISO 8601 format", async () => {
    mockDb.$queryRaw.mockResolvedValue([{ "?column?": 1 }])

    const res  = await GET()
    const body = await res.json()
    const ts   = new Date(body.timestamp)

    expect(ts.toString()).not.toBe("Invalid Date")
  })

  it("does not expose error internals in response", async () => {
    mockDb.$queryRaw.mockRejectedValue(new Error("password authentication failed for user eclat"))

    const res  = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.db).toBe("unavailable")
    // Internal error message must not leak to callers
    expect(JSON.stringify(body)).not.toContain("password authentication failed")
    expect(JSON.stringify(body)).not.toContain("eclat")
  })
})
