import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import { ConversationChat } from "./conversation-chat"

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

  return <ConversationChat conversationId={conversationId} otherUser={other} />
}
