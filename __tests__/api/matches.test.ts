/**
 * Tests for GET /api/matches
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
    match:    { findMany: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))

vi.mock("@/lib/security/audit-log", () => ({
  writeAuditLog:    vi.fn().mockResolvedValue(undefined),
  getIpFromHeaders: vi.fn().mockReturnValue("127.0.0.1"),
}))

// ── Imports ───────────────────────────────────────────────────────────────────

import { auth } from "@/lib/auth"
import { db }   from "@/lib/db"
import { GET }  from "@/app/api/matches/route"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb   = db as unknown as {
  match: { findMany: ReturnType<typeof vi.fn> }
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

const MATCHES = [
  {
    id:         "match_001",
    user1Id:    "user_001",
    user2Id:    "user_002",
    status:     "ACTIVE",
    matchedAt:  new Date("2025-06-01"),
    user1: { id: "user_001", name: "Test User",  profile: { photos: ["a.jpg"], profession: "Engineer",          location: "Mumbai" } },
    user2: { id: "user_002", name: "Priya S.",    profile: { photos: ["b.jpg"], profession: "Investment Banker", location: "Mumbai" } },
    conversation: { id: "conv_001" },
  },
]

describe("GET /api/matches", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(SESSION)
  })

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(new NextRequest("http://localhost:3000/api/matches"))
    expect(res.status).toBe(401)
  })

  it("returns all active matches for the user", async () => {
    mockDb.match.findMany.mockResolvedValue(MATCHES)
    const res  = await GET(new NextRequest("http://localhost:3000/api/matches"))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.matches).toHaveLength(1)
    expect(body.matches[0].id).toBe("match_001")
  })

  it("includes the other user's profile in each match", async () => {
    mockDb.match.findMany.mockResolvedValue(MATCHES)
    const res  = await GET(new NextRequest("http://localhost:3000/api/matches"))
    const body = await res.json()
    // From the perspective of user_001, the "other" user is user_002
    expect(body.matches[0].otherUser.id).toBe("user_002")
    expect(body.matches[0].otherUser.name).toBe("Priya S.")
  })

  it("includes conversationId in each match", async () => {
    mockDb.match.findMany.mockResolvedValue(MATCHES)
    const res  = await GET(new NextRequest("http://localhost:3000/api/matches"))
    const body = await res.json()
    expect(body.matches[0].conversationId).toBe("conv_001")
  })

  it("returns empty array when no matches", async () => {
    mockDb.match.findMany.mockResolvedValue([])
    const res  = await GET(new NextRequest("http://localhost:3000/api/matches"))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.matches).toHaveLength(0)
  })
})
