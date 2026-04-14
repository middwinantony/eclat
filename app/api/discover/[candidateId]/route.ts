import type { NextRequest } from "next/server";
import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db }   from "@/lib/db"
import { writeAuditLog, getIpFromHeaders } from "@/lib/security/audit-log"

const actionSchema = z.object({
  action: z.enum(["INTERESTED", "PASSED"]),
})

type RouteContext = { params: Promise<{ candidateId: string }> }

// Deterministic user ordering for the match unique constraint
function matchKey(a: string, b: string) {
  return a < b ? { user1Id: a, user2Id: b } : { user1Id: b, user2Id: a }
}

async function todayEntry(userId: string, candidateId: string) {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  return db.dailyQueue.findUnique({
    where: { userId_candidateId_date: { userId, candidateId, date } },
  })
}

async function createMatchIfMutual(userId: string, candidateId: string): Promise<boolean> {
  const reverseEntry = await todayEntry(candidateId, userId)
  if (reverseEntry?.action !== "INTERESTED") return false

  const key = matchKey(userId, candidateId)
  const existing = await db.match.findUnique({ where: { user1Id_user2Id: key } })
  if (existing) return false

  await db.match.create({
    data: { ...key, status: "ACTIVE", matchedAt: new Date(), conversation: { create: {} } },
  })
  return true
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const { candidateId } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { action } = parsed.data
  const userId = session.user.id

  const entry = await todayEntry(userId, candidateId)
  if (!entry) {
    return NextResponse.json({ error: "Queue entry not found" }, { status: 404 })
  }

  await db.dailyQueue.update({
    where: { id: entry.id },
    data:  { action, actedAt: new Date() },
  })

  let matched = false
  if (action === "INTERESTED") {
    matched = await createMatchIfMutual(userId, candidateId)
    await writeAuditLog({
      userId,
      action:    "profile_liked",
      entityId:  candidateId,
      ipAddress: getIpFromHeaders(req.headers),
    })
  } else {
    await writeAuditLog({
      userId,
      action:    "queue_passed",
      entityId:  candidateId,
      ipAddress: getIpFromHeaders(req.headers),
    })
  }

  return NextResponse.json({ success: true, matched })
}
