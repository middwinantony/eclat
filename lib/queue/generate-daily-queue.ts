import { db } from "@/lib/db"

const TIER_LIMITS: Record<string, number> = {
  SELECT:  3,
  RESERVE: 15,
  NOIR:    50,
}

function getTierLimit(tier: string | null | undefined): number {
  if (!tier) return 3
  return TIER_LIMITS[tier] ?? 3
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export async function generateDailyQueue(): Promise<{
  usersProcessed: number
  queuesCreated: number
}> {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30)

  const users = await db.user.findMany({
    where: {
      verificationStatus: "VERIFIED",
      deletedAt:          null,
      profile:            { isVisible: true },
    },
    select: {
      id:             true,
      membershipTier: true,
    },
  })

  let usersProcessed = 0
  let queuesCreated  = 0

  for (const user of users) {
    // Skip if today's queue already exists for this user
    const existingCount = await db.dailyQueue.count({
      where: { userId: user.id, date: today },
    })
    if (existingCount > 0) {
      usersProcessed++
      continue
    }

    // Candidates seen in the last 30 days
    const seenEntries = await db.dailyQueue.findMany({
      where: { userId: user.id, date: { gte: thirtyDaysAgo } },
      select: { candidateId: true },
    })
    const seenIds = seenEntries.map((e) => e.candidateId)

    // Candidates already matched with
    const matches = await db.match.findMany({
      where: { OR: [{ user1Id: user.id }, { user2Id: user.id }] },
      select: { user1Id: true, user2Id: true },
    })
    const matchedIds = matches.map((m) =>
      m.user1Id === user.id ? m.user2Id : m.user1Id,
    )

    const excludeIds = [...new Set([...seenIds, ...matchedIds, user.id])]

    const candidates = await db.user.findMany({
      where: {
        verificationStatus: "VERIFIED",
        deletedAt:          null,
        profile:            { isVisible: true },
        id:                 { notIn: excludeIds },
      },
      select: { id: true },
    })

    if (candidates.length === 0) {
      usersProcessed++
      continue
    }

    const limit  = getTierLimit(user.membershipTier)
    const picked = shuffle(candidates).slice(0, limit)

    await db.dailyQueue.createMany({
      data: picked.map((c) => ({
        userId:      user.id,
        candidateId: c.id,
        date:        today,
        action:      "UNSEEN" as const,
      })),
      skipDuplicates: true,
    })

    queuesCreated  += picked.length
    usersProcessed++
  }

  return { usersProcessed, queuesCreated }
}
