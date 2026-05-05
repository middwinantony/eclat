import { timingSafeEqual } from "crypto"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { writeAuditLog } from "@/lib/security/audit-log"
import { sendVerificationApproved, sendVerificationRejected } from "@/lib/email"

function adminAuth(req: NextRequest): boolean {
  const key    = req.headers.get("x-admin-key")
  const secret = process.env.ADMIN_SECRET_KEY
  if (!key || !secret) return false
  try {
    const a = Buffer.from(key)
    const b = Buffer.from(secret)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

const postSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT"]),
})

export async function POST(req: NextRequest) {
  if (!adminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "userId and action (APPROVE|REJECT) are required." },
      { status: 422 }
    )
  }

  const { userId, action } = parsed.data

  const user = await db.user.findUnique({
    where:  { id: userId },
    select: { id: true, email: true, name: true, deletedAt: true },
  })
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 })
  }
  if (user.deletedAt) {
    return NextResponse.json({ error: "User account is deleted." }, { status: 409 })
  }

  const verificationStatus = action === "APPROVE" ? "VERIFIED" : "REJECTED"

  await db.user.update({
    where: { id: userId },
    data:  { verificationStatus },
  })

  await writeAuditLog({
    userId:     null,
    action:     action === "APPROVE" ? "verification_approved" : "verification_rejected",
    entityType: "user",
    entityId:   userId,
  })

  try {
    if (action === "APPROVE") {
      await sendVerificationApproved(user.email, user.name)
    } else {
      await sendVerificationRejected(user.email, user.name)
    }
  } catch (err) {
    console.error("[verify-member] email failed:", err)
  }

  return NextResponse.json({ success: true, userId, action })
}

export async function GET(req: NextRequest) {
  if (!adminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limitParam = new URL(req.url).searchParams.get("limit")
  const take = Math.min(parseInt(limitParam ?? "100", 10) || 100, 100)

  const pending = await db.user.findMany({
    where: {
      verificationStatus: "PENDING",
      deletedAt:          null,
    },
    orderBy: { createdAt: "asc" },
    take,
    select: {
      id:        true,
      email:     true,
      name:      true,
      createdAt: true,
      profile: {
        select: {
          bio:        true,
          profession: true,
          location:   true,
        },
      },
    },
  })

  return NextResponse.json({ users: pending })
}
