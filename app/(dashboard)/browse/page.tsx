import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { BrowseCards } from "./browse-cards"

export default async function BrowsePage() {
  const session = await auth()
  if (!session) redirect("/login")

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const queue = await db.dailyQueue.findMany({
    where: { userId: session.user.id, date: today, action: "UNSEEN" },
    include: {
      candidate: {
        select: {
          id: true,
          name: true,
          profile: {
            select: {
              profession: true,
              location:   true,
              bio:        true,
              interests:  true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  const candidates = queue.map((q) => ({
    candidateId: q.candidateId,
    name:        q.candidate.name,
    profession:  q.candidate.profile?.profession  ?? null,
    location:    q.candidate.profile?.location    ?? null,
    bio:         q.candidate.profile?.bio         ?? null,
    interests:   q.candidate.profile?.interests   ?? [],
  }))

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 md:px-10 md:py-12">
      <div className="mb-8">
        <div className="ornament" aria-hidden="true">
          <span className="ornament-dot">✦</span>
        </div>
        <h1
          className="font-[family-name:var(--font-heading)] font-bold text-[#1C1218] tracking-[-0.03em] leading-tight mb-1.5"
          style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)" }}
        >
          Today&rsquo;s introductions.
        </h1>
        <p className="text-[#7A6670] text-sm">
          {candidates.length > 0
            ? `${candidates.length} curated introduction${candidates.length !== 1 ? "s" : ""} waiting for you`
            : "Your queue is empty for today."}
        </p>
      </div>

      <BrowseCards candidates={candidates} />
    </div>
  )
}
