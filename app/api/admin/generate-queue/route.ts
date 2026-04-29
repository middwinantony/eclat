import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { generateDailyQueue } from "@/lib/queue/generate-daily-queue"

export async function POST(req: NextRequest) {
  const adminKey = req.headers.get("x-admin-key")
  if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const summary = await generateDailyQueue()
    return NextResponse.json(summary)
  } catch (err) {
    console.error("[POST /api/admin/generate-queue] error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
