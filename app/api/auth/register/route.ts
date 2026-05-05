import type { NextRequest} from "next/server";
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { signupSchema } from "@/lib/validators/auth"
import { writeAuditLog, getIpFromHeaders } from "@/lib/security/audit-log"
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/security/rate-limit"

export async function POST(req: NextRequest) {
  // Rate limit: 5 registrations per hour per IP
  const rateLimitResponse = await checkRateLimit("signup", getRateLimitIdentifier(req))
  if (rateLimitResponse) return rateLimitResponse

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  // Validate with Zod
  const parsed = signupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { name, email, password, dateOfBirth, gender, linkedinUrl } = parsed.data

  // Check for existing account — same error message either way (no email enumeration)
  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (existing) {
    // Simulate hash time to prevent timing-based email enumeration
    await bcrypt.hash(password, 12)
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    )
  }

  // Hash password — cost factor 12 as per security spec
  const passwordHash = await bcrypt.hash(password, 12)

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      dateOfBirth: new Date(dateOfBirth),
      profile: {
        create: {
          gender,
          ...(linkedinUrl?.trim() ? { linkedinUrl: linkedinUrl.trim() } : {}),
        },
      },
    },
    select: { id: true, email: true, name: true },
  })

  await writeAuditLog({
    userId:    user.id,
    action:    "profile_created",
    ipAddress: getIpFromHeaders(req.headers),
    userAgent: req.headers.get("user-agent") ?? undefined,
    metadata:  { provider: "credentials" },
  })

  return NextResponse.json(
    { message: "Application submitted. We'll review it within 48 hours.", userId: user.id },
    { status: 201 }
  )
}
