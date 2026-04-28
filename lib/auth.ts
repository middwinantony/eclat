import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { loginSchema } from "@/lib/validators/auth"
import { writeAuditLog } from "@/lib/security/audit-log"
import type { Role, MembershipTier, VerificationStatus } from "@prisma/client"

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: Role
      verificationStatus: VerificationStatus
      membershipTier: MembershipTier | null
    }
  }

  interface User {
    role: Role
    verificationStatus: VerificationStatus
    membershipTier: MembershipTier | null
  }
}

// Custom JWT fields (augmentation removed — next-auth/jwt unresolvable during next build)
type AppJWT = {
  id: string
  role: Role
  verificationStatus: VerificationStatus
  membershipTier: MembershipTier | null
  [key: string]: unknown
}

const config: NextAuthConfig = {
  // JWT stored in httpOnly cookie — never localStorage
  session: { strategy: "jwt" },

  pages: {
    signIn:  "/login",
    error:   "/login",
    newUser: "/onboarding",
  },

  providers: [
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: { prompt: "consent", access_type: "offline" },
      },
    }),

    Credentials({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        // Validate shape with Zod before touching the DB
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const user = await db.user.findUnique({
          where: { email, deletedAt: null },
          select: {
            id:                 true,
            email:              true,
            name:               true,
            role:               true,
            passwordHash:       true,
            verificationStatus: true,
            membershipTier:     true,
          },
        })

        if (!user || !user.passwordHash) return null

        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return null

        return {
          id:                 user.id,
          email:              user.email,
          name:               user.name,
          role:               user.role,
          verificationStatus: user.verificationStatus,
          membershipTier:     user.membershipTier,
        }
      },
    }),
  ],

  callbacks: {
    // Persist custom fields into the JWT
    async jwt({ token, user, account, trigger }) {
      const t = token as AppJWT
      if (user) {
        t.id                = user.id as string
        t.role              = user.role
        t.verificationStatus= user.verificationStatus
        t.membershipTier    = user.membershipTier
      }

      // On OAuth sign-in, upsert the user record
      if (account?.provider === "google" && user?.email) {
        const existing = await db.user.findUnique({
          where: { email: user.email },
          select: { id: true, role: true, verificationStatus: true, membershipTier: true },
        })

        if (existing) {
          t.id                = existing.id
          t.role              = existing.role
          t.verificationStatus= existing.verificationStatus
          t.membershipTier    = existing.membershipTier
        } else {
          // Create user on first Google sign-in
          const created = await db.user.create({
            data: {
              email:       user.email,
              name:        user.name ?? "eclat Member",
              dateOfBirth: new Date("2000-01-01"),
              oauthAccounts: {
                create: {
                  provider:          account.provider,
                  providerAccountId: account.providerAccountId,
                  accessToken:       account.access_token ?? undefined,
                  refreshToken:      account.refresh_token ?? undefined,
                  expiresAt:         account.expires_at ?? undefined,
                },
              },
            },
          })
          t.id                = created.id
          t.role              = created.role
          t.verificationStatus= created.verificationStatus
          t.membershipTier    = null

          await writeAuditLog({
            userId:   created.id,
            action:   "profile_created",
            metadata: { provider: "google" },
          })
        }

        // Upsert OAuth account record for returning users
        if (existing) {
          await db.oAuthAccount.upsert({
            where: {
              provider_providerAccountId: {
                provider:          account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
            update: {
              accessToken:  account.access_token ?? undefined,
              refreshToken: account.refresh_token ?? undefined,
              expiresAt:    account.expires_at    ?? undefined,
            },
            create: {
              userId:            existing.id,
              provider:          account.provider,
              providerAccountId: account.providerAccountId,
              accessToken:       account.access_token  ?? undefined,
              refreshToken:      account.refresh_token ?? undefined,
              expiresAt:         account.expires_at    ?? undefined,
            },
          })
        }
      }

      // Refresh verification status on each token refresh
      if (trigger === "update" && t.id) {
        const fresh = await db.user.findUnique({
          where: { id: t.id },
          select: { verificationStatus: true, membershipTier: true, role: true },
        })
        if (fresh) {
          t.verificationStatus = fresh.verificationStatus
          t.membershipTier     = fresh.membershipTier
          t.role               = fresh.role
        }
      }

      return t
    },

    // Expose custom fields to the client-side session
    async session({ session, token }) {
      const t = token as AppJWT
      session.user.id                = t.id
      session.user.role              = t.role
      session.user.verificationStatus= t.verificationStatus
      session.user.membershipTier    = t.membershipTier
      return session
    },
  },

  events: {
    async signIn({ user }) {
      // user.id is the OAuth provider's ID for Google sign-ins, not our DB UUID.
      // Look up by email to get the real DB user ID.
      if (!user.email) return
      const dbUser = await db.user.findUnique({
        where: { email: user.email },
        select: { id: true },
      })
      // For brand-new Google sign-ins the user record is created later in the
      // jwt callback, so dbUser may be null — that first login is already
      // logged by the profile_created audit entry in the jwt callback.
      if (dbUser) {
        await writeAuditLog({ userId: dbUser.id, action: "login_success" })
      }
    },
    async signOut(message) {
      const token = "token" in message ? message.token : null
      if (token?.id) {
        await writeAuditLog({ userId: token.id as string, action: "logout" })
      }
    },
  },

  // Required for Railway / App Runner — disables CSRF host check
  trustHost: true,
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)
