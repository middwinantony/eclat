import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { writeAuditLog, getIpFromHeaders } from "@/lib/security/audit-log"

const schema = z.object({
  password:     z.string().optional(),
  confirmation: z.string(),
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
    return NextResponse.json({ error: "Invalid request." }, { status: 422 })
  }

  const { password, confirmation } = parsed.data

  if (confirmation !== "DELETE") {
    return NextResponse.json({ error: "Confirmation text must be DELETE." }, { status: 400 })
  }

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { passwordHash: true },
  })

  if (user?.passwordHash) {
    if (!password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 })
    }
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "Password is incorrect." }, { status: 400 })
    }
  }

  await db.$transaction([
    db.user.update({
      where: { id: session.user.id },
      data:  { deletedAt: new Date() },
    }),
    db.profile.updateMany({
      where: { userId: session.user.id },
      data:  { isVisible: false },
    }),
  ])

  await writeAuditLog({
    userId:    session.user.id,
    action:    "account_deleted",
    ipAddress: getIpFromHeaders(req.headers),
    userAgent: req.headers.get("user-agent") ?? undefined,
  })

  return NextResponse.json({ message: "Account deleted" })
}
