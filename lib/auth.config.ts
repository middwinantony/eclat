/**
 * auth.config.ts
 * Edge-compatible NextAuth config — no Prisma/Node.js APIs.
 *
 * Used exclusively by middleware.ts to verify JWTs on every request.
 * The full config (with DB lookups, account creation, audit logging) lives
 * in lib/auth.ts, which is NOT safe for the Edge Runtime.
 *
 * Why split?
 *   Next.js middleware runs in the Edge Runtime where Prisma is unavailable.
 *   We need JWT verification there, but NOT the full sign-in business logic.
 *   Auth.js v5 supports this pattern: edge config for middleware, full config
 *   for everything else.
 */

import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },

  pages: {
    signIn:  "/login",
    error:   "/login",
    newUser: "/onboarding",
  },

  // Providers listed here so Auth.js knows which cookies/flows to expect.
  // authorize() is a stub — real logic runs in lib/auth.ts on the Node runtime.
  providers: [
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize() {
        // Stub — never called from middleware.
        // The real authorize() in lib/auth.ts handles sign-in.
        return null
      },
    }),
  ],

  callbacks: {
    // Map JWT custom fields → session so middleware can read role/verificationStatus.
    // These fields were written to the token during sign-in (lib/auth.ts jwt callback).
    async session({ session, token }) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      if (token.id)                 session.user.id                 = token.id as string
      if (token.role)               session.user.role               = token.role as any
      if (token.verificationStatus) session.user.verificationStatus = token.verificationStatus as any
      session.user.membershipTier = (token.membershipTier as any) ?? null
      /* eslint-enable @typescript-eslint/no-explicit-any */
      return session
    },
  },

  trustHost: true,
}
