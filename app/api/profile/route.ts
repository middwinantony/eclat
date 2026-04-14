import type { NextRequest} from "next/server";
import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db }   from "@/lib/db"
import { writeAuditLog, getIpFromHeaders } from "@/lib/security/audit-log"

const patchSchema = z.object({
  bio:        z.string().max(1000).optional(),
  profession: z.string().max(100).optional(),
  employer:   z.string().max(100).optional(),
  location:   z.string().max(100).optional(),
  interests:  z.array(z.string().max(40)).max(20).optional(),
  isVisible:  z.boolean().optional(),
}).strict()

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const profile = await db.profile.findUnique({
    where: { userId: session.user.id },
  })

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }

  return NextResponse.json({ profile })
}

export async function PATCH(req: NextRequest) {
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

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const profile = await db.profile.update({
    where: { userId: session.user.id },
    data:  parsed.data,
  })

  await writeAuditLog({
    userId:    session.user.id,
    action:    "profile_updated",
    ipAddress: getIpFromHeaders(req.headers),
    userAgent: req.headers.get("user-agent") ?? undefined,
  })

  return NextResponse.json({ profile })
}
