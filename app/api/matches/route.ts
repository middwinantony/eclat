import type { NextRequest} from "next/server";
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db }   from "@/lib/db"

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const userId = session.user.id

  const matches = await db.match.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
      status: "ACTIVE",
    },
    include: {
      user1: {
        select: {
          id:   true,
          name: true,
          profile: { select: { photos: true, profession: true, location: true } },
        },
      },
      user2: {
        select: {
          id:   true,
          name: true,
          profile: { select: { photos: true, profession: true, location: true } },
        },
      },
      conversation: { select: { id: true } },
    },
    orderBy: { matchedAt: "desc" },
  })

  // Normalise: always expose the "other" person from this user's perspective
  const normalised = matches.map((m: typeof matches[number]) => {
    const otherUser = m.user1Id === userId ? m.user2 : m.user1
    return {
      id:             m.id,
      status:         m.status,
      matchedAt:      m.matchedAt,
      conversationId: m.conversation?.id ?? null,
      otherUser,
    }
  })

  return NextResponse.json({ matches: normalised })
}
