/**
 * Tests for GET /api/discover and POST /api/discover/[candidateId]/action
 * TDD: tests written before implementation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    dailyQueue: {
      findMany:   vi.fn(),
      findUnique: vi.fn(),
      update:     vi.fn(),
    },
    match:    { findUnique: vi.fn(), create: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))

vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit:         vi.fn().mockResolvedValue(null),
  getRateLimitIdentifier: vi.fn().mockReturnValue("ip:127.0.0.1"),
}))

vi.mock("@/lib/security/audit-log", () => ({
  writeAuditLog:    vi.fn().mockResolvedValue(undefined),
  getIpFromHeaders: vi.fn().mockReturnValue("127.0.0.1"),
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import { auth } from "@/lib/auth"
import { db }   from "@/lib/db"
import { GET }  from "@/app/api/discover/route"
import { POST } from "@/app/api/discover/[candidateId]/route"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb   = db as unknown as {
  dailyQueue: {
    findMany:   ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    update:     ReturnType<typeof vi.fn>
  }
  match: {
    findUnique: ReturnType<typeof vi.fn>
    create:     ReturnType<typeof vi.fn>
  }
}

const SESSION = {
  user: {
    id:                 "user_001",
    email:              "test@eclat.app",
    name:               "Test User",
    role:               "MEMBER",
    verificationStatus: "VERIFIED",
    membershipTier:     "RESERVE",
  },
}

const QUEUE_ENTRIES = [
  {
    id:          "q_001",
    userId:      "user_001",
    candidateId: "user_002",
    date:        new Date(),
    action:      "UNSEEN",
    candidate: {
      id:      "user_002",
      name:    "Priya S.",
      profile: { profession: "Investment Banker", location: "Mumbai", photos: ["photo1.jpg"] },
    },
  },
]

describe("GET /api/discover", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(SESSION)
  })

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(new NextRequest("http://localhost:3000/api/discover"))
    expect(res.status).toBe(401)
  })

  it("returns today's queue entries", async () => {
    mockDb.dailyQueue.findMany.mockResolvedValue(QUEUE_ENTRIES)
    const res  = await GET(new NextRequest("http://localhost:3000/api/discover"))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.queue).toHaveLength(1)
    expect(body.queue[0].candidateId).toBe("user_002")
  })

  it("returns empty queue when no entries today", async () => {
    mockDb.dailyQueue.findMany.mockResolvedValue([])
    const res  = await GET(new NextRequest("http://localhost:3000/api/discover"))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.queue).toHaveLength(0)
  })
})

describe("POST /api/discover/[candidateId]/action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(SESSION)
  })

  function makeRequest(candidateId: string, action: string): NextRequest {
    return new NextRequest(
      `http://localhost:3000/api/discover/${candidateId}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action }),
      }
    )
  }

  const PARAMS = { params: Promise.resolve({ candidateId: "user_002" }) }

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(makeRequest("user_002", "INTERESTED"), PARAMS)
    expect(res.status).toBe(401)
  })

  it("records PASSED action", async () => {
    mockDb.dailyQueue.findUnique.mockResolvedValue(QUEUE_ENTRIES[0])
    mockDb.dailyQueue.update.mockResolvedValue({ ...QUEUE_ENTRIES[0], action: "PASSED" })

    const res = await POST(makeRequest("user_002", "PASSED"), PARAMS)
    expect(res.status).toBe(200)
    expect(mockDb.dailyQueue.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "PASSED" }) })
    )
  })

  it("creates a match when both sides are INTERESTED", async () => {
    const mutualEntry = { ...QUEUE_ENTRIES[0], action: "INTERESTED" }
    // user_002 already expressed interest in user_001
    mockDb.dailyQueue.findUnique
      .mockResolvedValueOnce(QUEUE_ENTRIES[0])  // current entry
      .mockResolvedValueOnce(mutualEntry)        // reverse entry (user_002 → user_001)
    mockDb.dailyQueue.update.mockResolvedValue({ ...QUEUE_ENTRIES[0], action: "INTERESTED" })
    mockDb.match.findUnique.mockResolvedValue(null) // no existing match
    mockDb.match.create.mockResolvedValue({ id: "match_001" })

    const res  = await POST(makeRequest("user_002", "INTERESTED"), PARAMS)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.matched).toBe(true)
    expect(mockDb.match.create).toHaveBeenCalled()
  })

  it("returns 422 for invalid action values", async () => {
    const res = await POST(makeRequest("user_002", "INVALID_ACTION"), PARAMS)
    expect(res.status).toBe(422)
  })

  it("returns 404 when queue entry not found", async () => {
    mockDb.dailyQueue.findUnique.mockResolvedValue(null)
    const res = await POST(makeRequest("user_002", "PASSED"), PARAMS)
    expect(res.status).toBe(404)
  })
})
