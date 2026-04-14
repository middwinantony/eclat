/**
 * Tests for GET /api/profile and PATCH /api/profile
 * TDD: tests written before implementation.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// ── Mocks (must be before route imports) ─────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    profile:  { findUnique: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))

vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit:          vi.fn().mockResolvedValue(null),
  getRateLimitIdentifier:  vi.fn().mockReturnValue("ip:127.0.0.1"),
}))

vi.mock("@/lib/security/audit-log", () => ({
  writeAuditLog:    vi.fn().mockResolvedValue(undefined),
  getIpFromHeaders: vi.fn().mockReturnValue("127.0.0.1"),
}))

// ── Imports after mocks ───────────────────────────────────────────────────────

import { auth } from "@/lib/auth"
import { db }   from "@/lib/db"
import { GET, PATCH } from "@/app/api/profile/route"

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb   = db as unknown as {
  profile: {
    findUnique: ReturnType<typeof vi.fn>
    update:     ReturnType<typeof vi.fn>
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

const PROFILE = {
  id:         "profile_001",
  userId:     "user_001",
  bio:        "Senior engineer based in Mumbai.",
  profession: "Software Engineer",
  location:   "Mumbai",
  photos:     ["s3-key-1.jpg"],
  interests:  ["travel", "architecture"],
  isVisible:  true,
  createdAt:  new Date("2025-01-01"),
  updatedAt:  new Date("2025-01-01"),
}

function makeRequest(method = "GET", body?: object): NextRequest {
  return new NextRequest("http://localhost:3000/api/profile", {
    method,
    headers: { "Content-Type": "application/json" },
    body:    body ? JSON.stringify(body) : undefined,
  })
}

describe("GET /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(SESSION)
  })

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it("returns the authenticated user's profile", async () => {
    mockDb.profile.findUnique.mockResolvedValue(PROFILE)
    const res  = await GET(makeRequest())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.profile.userId).toBe("user_001")
    expect(body.profile.bio).toBe("Senior engineer based in Mumbai.")
  })

  it("returns 404 when profile does not exist", async () => {
    mockDb.profile.findUnique.mockResolvedValue(null)
    const res = await GET(makeRequest())
    expect(res.status).toBe(404)
  })
})

describe("PATCH /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(SESSION)
  })

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null)
    const res = await PATCH(makeRequest("PATCH", { bio: "hello" }))
    expect(res.status).toBe(401)
  })

  it("updates allowed profile fields", async () => {
    const updated = { ...PROFILE, bio: "Updated bio." }
    mockDb.profile.update.mockResolvedValue(updated)

    const res  = await PATCH(makeRequest("PATCH", { bio: "Updated bio." }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.profile.bio).toBe("Updated bio.")
    expect(mockDb.profile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_001" },
        data:  expect.objectContaining({ bio: "Updated bio." }),
      })
    )
  })

  it("rejects requests containing non-updatable fields like userId", async () => {
    // The schema uses .strict() — unknown fields return 422, never reach db.update
    const res = await PATCH(makeRequest("PATCH", { bio: "New bio", userId: "hacker_999" }))
    expect(res.status).toBe(422)
    expect(mockDb.profile.update).not.toHaveBeenCalled()
  })

  it("returns 422 for invalid data", async () => {
    // bio exceeding max length
    const res = await PATCH(makeRequest("PATCH", { bio: "x".repeat(1001) }))
    expect(res.status).toBe(422)
  })
})
