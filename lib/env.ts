/**
 * env.ts
 * Fail-fast environment variable validation.
 *
 * Imported once at app startup (app/layout.tsx server component).
 * Crashes immediately with a clear message if required vars are missing,
 * so misconfigured deployments fail at boot rather than at the first request.
 *
 * Split into tiers:
 *   REQUIRED  — app cannot function at all without these
 *   PAYMENTS  — required when ENABLE_PAYMENTS=true (skippable in dev)
 *   REALTIME  — required when ENABLE_REALTIME=true
 *   AWS       — required in production; optional in dev (KMS falls back to base64)
 */

type EnvVar = {
  key: string
  description: string
  example?: string
}

const REQUIRED: EnvVar[] = [
  { key: "DATABASE_URL",   description: "PostgreSQL connection string",   example: "postgresql://user:pass@host:5432/db" },
  { key: "NEXTAUTH_SECRET",description: "JWT signing secret (≥32 chars)", example: "openssl rand -base64 32" },
  { key: "NEXTAUTH_URL",   description: "App base URL",                   example: "http://localhost:3000" },
]

const OAUTH: EnvVar[] = [
  { key: "GOOGLE_CLIENT_ID",     description: "Google OAuth client ID"     },
  { key: "GOOGLE_CLIENT_SECRET", description: "Google OAuth client secret" },
]

const PAYMENTS: EnvVar[] = [
  { key: "STRIPE_SECRET_KEY",              description: "Stripe secret key (sk_test_... or sk_live_...)" },
  { key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", description: "Stripe publishable key" },
  { key: "STRIPE_WEBHOOK_SECRET",          description: "Stripe webhook signing secret" },
  { key: "RAZORPAY_KEY_ID",                description: "Razorpay key ID" },
  { key: "RAZORPAY_KEY_SECRET",            description: "Razorpay key secret" },
  { key: "RAZORPAY_WEBHOOK_SECRET",        description: "Razorpay webhook secret" },
]

const REALTIME: EnvVar[] = [
  { key: "PUSHER_APP_ID",  description: "Pusher application ID" },
  { key: "PUSHER_KEY",     description: "Pusher key"            },
  { key: "PUSHER_SECRET",  description: "Pusher secret"         },
  { key: "PUSHER_CLUSTER", description: "Pusher cluster",       example: "ap2" },
  { key: "DAILY_API_KEY",  description: "Daily.co API key"      },
  { key: "DAILY_DOMAIN",   description: "Daily.co domain",      example: "eclat.daily.co" },
]

const EMAIL: EnvVar[] = [
  { key: "RESEND_API_KEY", description: "Resend API key" },
  { key: "EMAIL_FROM",     description: "From address for transactional emails" },
]

const REDIS: EnvVar[] = [
  { key: "UPSTASH_REDIS_REST_URL",   description: "Upstash Redis REST URL"   },
  { key: "UPSTASH_REDIS_REST_TOKEN", description: "Upstash Redis REST token" },
]

const AWS_PROD: EnvVar[] = [
  { key: "AWS_REGION",              description: "AWS region",             example: "ap-southeast-1" },
  { key: "AWS_S3_BUCKET_PROFILES",  description: "S3 bucket for photos"                              },
  { key: "AWS_S3_BUCKET_VERIFICATION", description: "S3 bucket for govt IDs"                        },
  { key: "AWS_KMS_KEY_ARN",         description: "KMS key ARN for field encryption"                  },
]

function check(vars: EnvVar[], groupName: string): string[] {
  const missing: string[] = []
  for (const { key, description, example } of vars) {
    if (!process.env[key]) {
      const hint = example ? ` (e.g. ${example})` : ""
      missing.push(`  • ${key} — ${description}${hint}`)
    }
  }
  if (missing.length > 0) {
    console.error(`\n[env] Missing ${groupName} variables:\n${missing.join("\n")}`)
  }
  return missing
}

export function validateEnv(): void {
  // Only run on the server
  if (typeof window !== "undefined") return

  const isProduction = process.env.NODE_ENV === "production"
  const enablePayments = process.env.ENABLE_PAYMENTS === "true" || isProduction
  const enableRealtime = process.env.ENABLE_REALTIME === "true" || isProduction

  const allMissing: string[] = [
    ...check(REQUIRED, "core"),
    ...check(OAUTH,    "Google OAuth"),
    ...check(EMAIL,    "email"),
    ...check(REDIS,    "Upstash Redis"),
    ...(enablePayments ? check(PAYMENTS, "payments") : []),
    ...(enableRealtime ? check(REALTIME, "realtime") : []),
    ...(isProduction   ? check(AWS_PROD, "AWS production") : []),
  ]

  if (allMissing.length > 0) {
    const header = isProduction
      ? "[env] FATAL: Missing required environment variables. Refusing to start."
      : "[env] WARNING: Some environment variables are missing. Certain features will not work."

    console.error(`\n${header}\n`)
    console.error("Copy .env.local.example → .env.local and fill in the values.\n")

    if (isProduction) {
      // Hard crash in production — no silent half-broken deployments
      process.exit(1)
    }
  }
}
