import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

const sendSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().min(1).max(2000),
})

async function getConversationForUser(conversationId: string, userId: string) {
  return db.conversation.findUnique({
    where: { id: conversationId },
    include: { match: { select: { user1Id: true, user2Id: true } } },
  })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const conversationId = req.nextUrl.searchParams.get("conversationId")
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId is required" }, { status: 400 })
  }

  const userId = session.user.id

  try {
    const conversation = await getConversationForUser(conversationId, userId)

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const { user1Id, user2Id } = conversation.match
    if (userId !== user1Id && userId !== user2Id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const messages = await db.message.findMany({
      where: { conversationId },
      include: { sender: { select: { id: true, name: true } } },
      orderBy: { sentAt: "asc" },
    })

    const result = messages.map((m) => ({
      id:         m.id,
      content:    m.contentEnc,
      senderId:   m.senderId,
      senderName: m.sender.name,
      createdAt:  m.sentAt.toISOString(),
      isMe:       m.senderId === userId,
    }))

    return NextResponse.json({ messages: result })
  } catch (err) {
    console.error("[GET /api/messages] error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const userId = session.user.id

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = sendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { conversationId, content } = parsed.data

  try {
    const conversation = await getConversationForUser(conversationId, userId)

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const { user1Id, user2Id } = conversation.match
    if (userId !== user1Id && userId !== user2Id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const message = await db.message.create({
      data: {
        conversationId,
        senderId:   userId,
        contentEnc: content,
      },
      include: { sender: { select: { id: true, name: true } } },
    })

    return NextResponse.json(
      {
        id:         message.id,
        content:    message.contentEnc,
        senderId:   message.senderId,
        senderName: message.sender.name,
        createdAt:  message.sentAt.toISOString(),
        isMe:       true,
      },
      { status: 201 },
    )
  } catch (err) {
    console.error("[POST /api/messages] error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
