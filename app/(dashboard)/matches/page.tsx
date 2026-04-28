import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { MapPin, Briefcase, MessageSquare } from "lucide-react"

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(" ")
  const letters =
    parts.length >= 2
      ? parts[0][0] + parts[parts.length - 1][0]
      : name.slice(0, 2)
  return (
    <div className="w-12 h-12 rounded-full bg-[#A8476A]/10 border border-[#A8476A]/20 flex items-center justify-center flex-shrink-0">
      <span className="font-[family-name:var(--font-heading)] font-semibold text-base text-[#A8476A]">
        {letters.toUpperCase()}
      </span>
    </div>
  )
}

export default async function MatchesPage() {
  const session = await auth()
  if (!session) redirect("/login")

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
          profile: { select: { profession: true, location: true } },
        },
      },
      user2: {
        select: {
          id:   true,
          name: true,
          profile: { select: { profession: true, location: true } },
        },
      },
      conversation: { select: { id: true } },
    },
    orderBy: { matchedAt: "desc" },
  })

  const normalised = matches.map((m) => {
    const other = m.user1Id === userId ? m.user2 : m.user1
    return {
      matchId:        m.id,
      conversationId: m.conversation?.id ?? null,
      matchedAt:      m.matchedAt,
      other: {
        id:         other.id,
        name:       other.name,
        profession: other.profile?.profession ?? null,
        location:   other.profile?.location   ?? null,
      },
    }
  })

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 md:px-10 md:py-12">
      <div className="mb-8">
        <div className="ornament" aria-hidden="true">
          <span className="ornament-dot">✦</span>
        </div>
        <h1
          className="font-[family-name:var(--font-heading)] font-bold text-[#1C1218] tracking-[-0.03em] leading-tight mb-1.5"
          style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)" }}
        >
          Your matches.
        </h1>
        <p className="text-[#7A6670] text-sm">
          {normalised.length > 0
            ? `${normalised.length} active connection${normalised.length !== 1 ? "s" : ""}`
            : "No matches yet — keep browsing your daily introductions."}
        </p>
      </div>

      {normalised.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-[#7A6670] text-sm">
            Matches appear here when both of you express interest.<br />
            Head to{" "}
            <Link href="/browse" className="text-[#A8476A] hover:underline underline-offset-2">
              Browse
            </Link>{" "}
            to review today&rsquo;s introductions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {normalised.map((m) => (
            <div
              key={m.matchId}
              className="flex items-center gap-4 rounded-xl border border-black/[0.07] bg-white p-5 hover:border-[#A8476A]/20 transition-colors duration-150"
            >
              <Initials name={m.other.name} />

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1C1218] text-sm truncate">{m.other.name}</p>
                <div className="flex flex-wrap gap-3 mt-1">
                  {m.other.profession && (
                    <span className="flex items-center gap-1 text-xs text-[#7A6670]">
                      <Briefcase size={11} /> {m.other.profession}
                    </span>
                  )}
                  {m.other.location && (
                    <span className="flex items-center gap-1 text-xs text-[#7A6670]">
                      <MapPin size={11} /> {m.other.location}
                    </span>
                  )}
                </div>
                {m.matchedAt && (
                  <p className="text-xs text-[#B0A0A8] mt-1">
                    Matched {new Date(m.matchedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                )}
              </div>

              {m.conversationId && (
                <Link
                  href={`/messages/${m.conversationId}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#A8476A]/10 border border-[#A8476A]/20 text-[#A8476A] text-xs font-medium hover:bg-[#A8476A]/20 transition-colors duration-150 flex-shrink-0"
                >
                  <MessageSquare size={13} />
                  Message
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
