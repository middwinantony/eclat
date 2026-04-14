/**
 * Mock NextAuth `auth()` for API route tests.
 * Import this before the route under test so the vi.mock hoisting works.
 */
import { vi } from "vitest"
import type { MembershipTier, VerificationStatus, Role } from "@prisma/client"

export interface MockSession {
  user: {
    id: string
    email: string
    name: string
    role: Role
    verificationStatus: VerificationStatus
    membershipTier: MembershipTier | null
  }
}

export const DEFAULT_SESSION: MockSession = {
  user: {
    id:                 "user_test_001",
    email:              "test@eclat.app",
    name:               "Test User",
    role:               "MEMBER",
    verificationStatus: "VERIFIED",
    membershipTier:     "RESERVE",
  },
}

export function mockAuth(session: MockSession | null = DEFAULT_SESSION) {
  vi.mock("@/lib/auth", () => ({
    auth: vi.fn().mockResolvedValue(session),
  }))
}

export function mockDb() {
  vi.mock("@/lib/db", () => ({
    db: {
      user:       { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
      profile:    { findUnique: vi.fn(), update: vi.fn(), upsert: vi.fn() },
      dailyQueue: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
      match:      { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
      auditLog:   { create: vi.fn() },
    },
  }))
}
