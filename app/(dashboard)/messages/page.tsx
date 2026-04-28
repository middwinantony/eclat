import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { MessageSquare } from "lucide-react"

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(" ")
  const letters =
    parts.length >= 2
      ? parts[0][0] + parts[parts.length - 1][0]
      : name.slice(0, 2)
  return (
    <div className="w-10 h-10 rounded-full bg-[#A8476A]/10 border border-[#A8476A]/20 flex items-center justify-center flex-shrink-0">
      <span className="font-[family-name:var(--font-heading)] font-semibold text-sm text-[#A8476A]">
        {letters.toUpperCase()}
      </span>
    </div>
  )
}

export default async function MessagesPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const userId = session.user.id

  const conversations = await db.conversation.findMany({
    where: {
      match: {
        status: "ACTIVE",
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
    },
    include: {
      match: {
        include: {
          user1: { select: { id: true, name: true } },
          user2: { select: { id: true, name: true } },
        },
      },
      messages: {
        orderBy: { sentAt: "desc" },
        take: 1,
        select: { sentAt: true, senderId: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const items = conversations.map((c) => {
    const other = c.match.user1Id === userId ? c.match.user2 : c.match.user1
    const lastMsg = c.messages[0] ?? null
    return {
      conversationId: c.id,
      other,
      lastActivity:   lastMsg?.sentAt ?? c.createdAt,
      hasMessages:    c.messages.length > 0,
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
          Messages.
        </h1>
        <p className="text-[#7A6670] text-sm">
          {items.length > 0
            ? `${items.length} conversation${items.length !== 1 ? "s" : ""}`
            : "No conversations yet."}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <MessageSquare size={24} className="text-[#B0A0A8] mx-auto mb-3" />
          <p className="text-[#7A6670] text-sm">
            Conversations unlock when you match with someone.<br />
            Visit{" "}
            <Link href="/matches" className="text-[#A8476A] hover:underline underline-offset-2">
              Matches
            </Link>{" "}
            to see your connections.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.conversationId}
              href={`/messages/${item.conversationId}`}
              className="flex items-center gap-4 rounded-xl border border-black/[0.07] bg-white p-4 hover:border-[#A8476A]/20 hover:bg-[#A8476A]/[0.03] transition-all duration-150"
            >
              <Initials name={item.other.name} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1C1218] text-sm">{item.other.name}</p>
                <p className="text-xs text-[#7A6670] mt-0.5">
                  {item.hasMessages ? "Tap to continue the conversation" : "Say hello — you matched!"}
                </p>
              </div>
              <p className="text-xs text-[#B0A0A8] flex-shrink-0">
                {new Date(item.lastActivity).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
