import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { writeAuditLog, getIpFromHeaders } from "@/lib/security/audit-log"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  // Soft-delete — a background job hard-deletes after 30 days (per schema comment)
  await db.user.update({
    where: { id: session.user.id },
    data:  { deletedAt: new Date() },
  })

  await writeAuditLog({
    userId:    session.user.id,
    action:    "account_deleted",
    ipAddress: getIpFromHeaders(req.headers),
    userAgent: req.headers.get("user-agent") ?? undefined,
  })

  return NextResponse.json({ success: true })
}
