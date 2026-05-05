import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { writeAuditLog, getIpFromHeaders } from "@/lib/security/audit-log"

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { currentPassword, newPassword } = parsed.data

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  })

  if (!user?.passwordHash) {
    return NextResponse.json(
      { error: "Password change is not available for accounts signed in with Google." },
      { status: 400 }
    )
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 })
  }

  if (currentPassword === newPassword) {
    return NextResponse.json({ error: "New password must differ from current password." }, { status: 400 })
  }

  const newHash = await bcrypt.hash(newPassword, 12)

  await db.user.update({
    where: { id: session.user.id },
    data:  { passwordHash: newHash },
  })

  await writeAuditLog({
    userId:    session.user.id,
    action:    "password_change",
    ipAddress: getIpFromHeaders(req.headers),
    userAgent: req.headers.get("user-agent") ?? undefined,
  })

  return NextResponse.json({ success: true })
}
