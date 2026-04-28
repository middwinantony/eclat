import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Zap } from "lucide-react"

type Props = { params: Promise<{ conversationId: string }> }

export default async function ConversationPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect("/login")

  const { conversationId } = await params
  const userId = session.user.id

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      match: {
        include: {
          user1: { select: { id: true, name: true } },
          user2: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!conversation) notFound()

  const { user1, user2 } = conversation.match
  if (user1.id !== userId && user2.id !== userId) notFound()

  const other = user1.id === userId ? user2 : user1

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 md:px-10 md:py-12">
      {/* Back */}
      <Link
        href="/messages"
        className="inline-flex items-center gap-2 text-sm text-[#7A6670] hover:text-[#1C1218] transition-colors mb-8"
      >
        <ArrowLeft size={14} />
        Messages
      </Link>

      <div className="mb-8">
        <div className="ornament" aria-hidden="true">
          <span className="ornament-dot">✦</span>
        </div>
        <h1
          className="font-[family-name:var(--font-heading)] font-bold text-[#1C1218] tracking-[-0.03em] leading-tight"
          style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}
        >
          {other.name}
        </h1>
      </div>

      <div className="card p-10 text-center space-y-4">
        <div className="w-10 h-10 rounded-full bg-[#A8476A]/10 border border-[#A8476A]/20 flex items-center justify-center mx-auto">
          <Zap size={18} className="text-[#A8476A]" />
        </div>
        <p className="font-[family-name:var(--font-heading)] font-semibold text-[#1C1218] text-lg">
          Real-time chat coming soon.
        </p>
        <p className="text-[#7A6670] text-sm leading-relaxed max-w-sm mx-auto">
          We&rsquo;re building the messaging experience. Once live, you&rsquo;ll be
          able to chat with {other.name} directly here.
        </p>
      </div>
    </div>
  )
}
