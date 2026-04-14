import type { NextRequest} from "next/server";
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db }   from "@/lib/db"

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  // Today's date at midnight UTC — matches the daily_queue.date column
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const queue = await db.dailyQueue.findMany({
    where: {
      userId: session.user.id,
      date:   today,
    },
    include: {
      candidate: {
        select: {
          id:   true,
          name: true,
          profile: {
            select: {
              profession: true,
              location:   true,
              photos:     true,
              bio:        true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({ queue })
}
