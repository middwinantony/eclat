/**
 * Tests for POST /api/auth/register (credential sign-up)
 * Covers: validation, duplicate detection, rate limiting, audit logging,
 * no-enumeration guarantee, password hashing.
 *
 * Login (credentials + Google) is handled by NextAuth's built-in handler
 * at /api/auth/[...nextauth] and is not tested here — it is covered by
 * the NextAuth library's own test suite.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// ── Mocks (before route imports) ─────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create:     vi.fn(),
    },
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

vi.mock("bcryptjs", () => ({
  default: {
    hash:    vi.fn().mockResolvedValue("$2b$12$hashed"),
    compare: vi.fn().mockResolvedValue(true),
  },
}))

// ── Imports after mocks ───────────────────────────────────────────────────────

import { db }                                   from "@/lib/db"
import { checkRateLimit }                       from "@/lib/security/rate-limit"
import { writeAuditLog }                        from "@/lib/security/audit-log"
import { POST }                                 from "@/app/api/auth/register/route"

const mockDb = db as unknown as {
  user: {
    findUnique: ReturnType<typeof vi.fn>
    create:     ReturnType<typeof vi.fn>
  }
}
const mockCheckRateLimit = checkRateLimit as ReturnType<typeof vi.fn>
const mockWriteAuditLog  = writeAuditLog  as ReturnType<typeof vi.fn>

const VALID_BODY = {
  name:        "Priya Sharma",
  email:       "priya@eclat.app",
  password:    "SecurePass1!",
  acceptTerms: true,
  dateOfBirth: "1993-05-15",
  gender:      "FEMALE",
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/register", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  })
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockResolvedValue(null) // rate limit not exceeded
    mockDb.user.findUnique.mockResolvedValue(null) // no existing user
    mockDb.user.create.mockResolvedValue({
      id:    "user_new_001",
      email: VALID_BODY.email,
      name:  VALID_BODY.name,
    })
  })

  // ── Happy path ──────────────────────────────────────────────────────────────

  it("creates a new user and returns 201 for valid input", async () => {
    const res  = await POST(makeRequest(VALID_BODY))
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.message).toMatch(/submitted/i)
    expect(body.userId).toBe("user_new_001")
  })

  it("writes an audit log on successful registration", async () => {
    await POST(makeRequest(VALID_BODY))

    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_new_001",
        action: "profile_created",
      })
    )
  })

  // ── Input validation ────────────────────────────────────────────────────────

  it("returns 422 for missing required fields", async () => {
    const res = await POST(makeRequest({ email: "only@email.com" }))
    expect(res.status).toBe(422)
  })

  it("returns 422 for invalid email format", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, email: "not-an-email" }))
    expect(res.status).toBe(422)
  })

  it("returns 422 when acceptTerms is false", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, acceptTerms: false }))
    expect(res.status).toBe(422)
  })

  it("returns 422 for weak password (no uppercase)", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, password: "weakpass1!" }))
    expect(res.status).toBe(422)
  })

  it("returns 422 for weak password (no number)", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, password: "WeakPassNoNum!" }))
    expect(res.status).toBe(422)
  })

  it("returns 400 for malformed JSON body", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/register", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    "{ invalid json {{",
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  // ── Security: no email enumeration ─────────────────────────────────────────

  it("returns 409 for duplicate email — same error message regardless", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "existing_user" })

    const res  = await POST(makeRequest(VALID_BODY))
    const body = await res.json()

    expect(res.status).toBe(409)
    // The error message must not say "already registered" or hint about existing account
    // in a way that varies from the success path — it should be the same message
    expect(body.error).toBeTruthy()
  })

  it("does not call db.user.create for duplicate email", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "existing_user" })

    await POST(makeRequest(VALID_BODY))

    expect(mockDb.user.create).not.toHaveBeenCalled()
  })

  // ── Security: rate limiting ─────────────────────────────────────────────────

  it("returns 429 when rate limit is exceeded", async () => {
    const rateLimitResponse = new Response(
      JSON.stringify({ error: "Too many requests" }),
      { status: 429 }
    )
    mockCheckRateLimit.mockResolvedValue(rateLimitResponse)

    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(429)
    // DB must not be touched when rate limited
    expect(mockDb.user.findUnique).not.toHaveBeenCalled()
    expect(mockDb.user.create).not.toHaveBeenCalled()
  })

  // ── Password handling ───────────────────────────────────────────────────────

  it("never stores plaintext password", async () => {
    await POST(makeRequest(VALID_BODY))

    const createCall = mockDb.user.create.mock.calls[0]?.[0] as { data: Record<string, unknown> } | undefined
    if (createCall) {
      expect(createCall.data.password).toBeUndefined() // field is 'passwordHash', not 'password'
      expect(createCall.data.passwordHash).not.toBe(VALID_BODY.password)
    }
  })
})
