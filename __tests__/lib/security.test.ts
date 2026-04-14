/**
 * Tests for security utilities:
 *   - Rate limiting (lib/security/rate-limit.ts)
 *   - Encryption (lib/security/encrypt.ts)
 *   - Audit logging (lib/security/audit-log.ts)
 *
 * AWS KMS is never called in tests — the encrypt module falls back to base64
 * when AWS_KMS_KEY_ARN is not set and NODE_ENV !== 'production'.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"

// ─── Rate limiting tests ───────────────────────────────────────────────────────

describe("getRateLimitIdentifier", () => {
  // Import after env is configured
  it("uses userId for authenticated requests", async () => {
    const { getRateLimitIdentifier } = await import("@/lib/security/rate-limit")
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    })

    const id = getRateLimitIdentifier(req, "user_abc123")
    expect(id).toBe("user:user_abc123")
  })

  it("uses x-forwarded-for IP for unauthenticated requests", async () => {
    const { getRateLimitIdentifier } = await import("@/lib/security/rate-limit")
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1" },
    })

    const id = getRateLimitIdentifier(req)
    // Should take first IP from comma-separated list
    expect(id).toBe("ip:192.168.1.1")
  })

  it("uses x-real-ip when x-forwarded-for is absent", async () => {
    const { getRateLimitIdentifier } = await import("@/lib/security/rate-limit")
    const req = new NextRequest("http://localhost/api/test", {
      headers: { "x-real-ip": "203.0.113.5" },
    })

    const id = getRateLimitIdentifier(req)
    expect(id).toBe("ip:203.0.113.5")
  })

  it("falls back to 'unknown' when no IP headers present", async () => {
    const { getRateLimitIdentifier } = await import("@/lib/security/rate-limit")
    const req = new NextRequest("http://localhost/api/test")

    const id = getRateLimitIdentifier(req)
    expect(id).toBe("ip:unknown")
  })
})

// ─── Rate limit middleware (Upstash mocked) ────────────────────────────────────

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.resetModules()
    // Provide fake Upstash env vars so the module can be imported
    process.env.UPSTASH_REDIS_REST_URL   = "https://fake.upstash.io"
    process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token"
  })

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it("returns null when limit is not exceeded", async () => {
    vi.mock("@upstash/ratelimit", () => ({
      Ratelimit: vi.fn().mockImplementation(() => ({
        limit: vi.fn().mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: Date.now() + 60000 }),
      })),
    }))
    vi.mock("@upstash/redis", () => ({
      Redis: vi.fn().mockImplementation(() => ({})),
    }))

    const { checkRateLimit } = await import("@/lib/security/rate-limit")
    const result = await checkRateLimit("login", "ip:1.2.3.4")
    expect(result).toBeNull()
  })

  it("returns 429 response when limit is exceeded", async () => {
    vi.mock("@upstash/ratelimit", () => ({
      Ratelimit: vi.fn().mockImplementation(() => ({
        limit: vi.fn().mockResolvedValue({ success: false, limit: 5, remaining: 0, reset: Date.now() + 60000 }),
      })),
    }))
    vi.mock("@upstash/redis", () => ({
      Redis: vi.fn().mockImplementation(() => ({})),
    }))

    const { checkRateLimit } = await import("@/lib/security/rate-limit")
    const result = await checkRateLimit("login", "ip:1.2.3.4")

    expect(result).not.toBeNull()
    expect(result?.status).toBe(429)
    const body = await result?.json()
    expect(body.error).toMatch(/too many requests/i)
  })

  it("fails open (returns null) when Redis is unavailable", async () => {
    vi.mock("@upstash/ratelimit", () => ({
      Ratelimit: vi.fn().mockImplementation(() => ({
        limit: vi.fn().mockRejectedValue(new Error("Redis connection refused")),
      })),
    }))
    vi.mock("@upstash/redis", () => ({
      Redis: vi.fn().mockImplementation(() => ({})),
    }))

    const { checkRateLimit } = await import("@/lib/security/rate-limit")
    // Should not throw — fail open to avoid blocking legitimate requests
    const result = await checkRateLimit("login", "ip:1.2.3.4")
    expect(result).toBeNull()
  })
})

// ─── Encryption (dev fallback — no real KMS) ──────────────────────────────────

describe("encrypt.ts — development fallback", () => {
  beforeEach(() => {
    vi.resetModules()
    // No KMS key ARN — triggers the dev fallback (base64)
    delete process.env.AWS_KMS_KEY_ARN
    process.env.NODE_ENV = "development"
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("encryptField returns a non-empty string in dev mode", async () => {
    const { encryptField } = await import("@/lib/security/encrypt")
    const result = await encryptField("hello@eclat.app")

    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
    // In dev, returns base64 of the input
    expect(Buffer.from(result, "base64").toString("utf-8")).toBe("hello@eclat.app")
  })

  it("encryptField output differs from plaintext input", async () => {
    const { encryptField } = await import("@/lib/security/encrypt")
    const plaintext = "sensitive-data"
    const encrypted = await encryptField(plaintext)

    expect(encrypted).not.toBe(plaintext)
  })

  it("decryptField recovers the original plaintext in dev mode", async () => {
    const { encryptField, decryptField } = await import("@/lib/security/encrypt")
    const original  = "priya@eclat.app"
    const encrypted = await encryptField(original)
    const decrypted = await decryptField(encrypted)

    expect(decrypted).toBe(original)
  })

  it("round-trips IP addresses correctly", async () => {
    const { encryptField, decryptField } = await import("@/lib/security/encrypt")
    const ip        = "203.0.113.42"
    const encrypted = await encryptField(ip)
    const decrypted = await decryptField(encrypted)

    expect(decrypted).toBe(ip)
  })

  it("encryptOptionalField returns null for null input", async () => {
    const { encryptOptionalField } = await import("@/lib/security/encrypt")
    const result = await encryptOptionalField(null)
    expect(result).toBeNull()
  })

  it("encryptOptionalField returns null for undefined input", async () => {
    const { encryptOptionalField } = await import("@/lib/security/encrypt")
    const result = await encryptOptionalField(undefined)
    expect(result).toBeNull()
  })

  it("encryptOptionalField encrypts non-null values", async () => {
    const { encryptOptionalField } = await import("@/lib/security/encrypt")
    const result = await encryptOptionalField("not null")
    expect(result).not.toBeNull()
    expect(typeof result).toBe("string")
  })
})

// ─── Audit log ────────────────────────────────────────────────────────────────

describe("writeAuditLog", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("writes a record to the audit_log table", async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: "audit_001" })

    vi.mock("@/lib/db", () => ({
      db: {
        auditLog: { create: mockCreate },
      },
    }))

    vi.mock("@/lib/security/encrypt", () => ({
      encryptOptionalField: vi.fn().mockImplementation(async (v) => v ? `enc:${v}` : null),
    }))

    const { writeAuditLog } = await import("@/lib/security/audit-log")

    await writeAuditLog({
      userId:    "user_001",
      action:    "login_success",
      ipAddress: "203.0.113.1",
      userAgent: "Mozilla/5.0",
    })

    expect(mockCreate).toHaveBeenCalledOnce()
    const callArg = mockCreate.mock.calls[0][0] as { data: Record<string, unknown> }
    expect(callArg.data.userId).toBe("user_001")
    expect(callArg.data.action).toBe("login_success")
    // IP address must be encrypted before storage
    expect(callArg.data.ipAddress).not.toBe("203.0.113.1")
  })

  it("does not throw if userId is null (unauthenticated action)", async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: "audit_002" })

    vi.mock("@/lib/db", () => ({
      db: { auditLog: { create: mockCreate } },
    }))
    vi.mock("@/lib/security/encrypt", () => ({
      encryptOptionalField: vi.fn().mockResolvedValue(null),
    }))

    const { writeAuditLog } = await import("@/lib/security/audit-log")

    await expect(
      writeAuditLog({ userId: undefined, action: "login_failure" })
    ).resolves.not.toThrow()
  })
})
