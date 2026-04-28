"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, Send } from "lucide-react"

type Message = {
  id: string
  content: string
  senderId: string
  senderName: string
  createdAt: string
  isMe: boolean
}

type Props = {
  conversationId: string
  otherUser: { id: string; name: string }
}

export function ConversationChat({ conversationId, otherUser }: Props) {
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState("")
  const [sending, setSending]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)

  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?conversationId=${conversationId}`)
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages)
    } catch {
      // silent poll failure — network blip, do nothing
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  useEffect(() => { fetchMessages() }, [fetchMessages])

  useEffect(() => {
    const id = setInterval(fetchMessages, 30_000)
    return () => clearInterval(id)
  }, [fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function growTextarea() {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = Math.min(ta.scrollHeight, 128) + "px"
  }

  async function handleSend() {
    const content = input.trim()
    if (!content || sending) return

    setError(null)
    setSending(true)

    try {
      const res = await fetch("/api/messages", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ conversationId, content }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? "Failed to send")
      }

      const newMsg: Message = await res.json()
      setMessages((prev) => [...prev, newMsg])
      setInput("")
      if (textareaRef.current) textareaRef.current.style.height = "auto"
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-black/[0.07] bg-white px-6 pt-5 pb-4">
        <Link
          href="/messages"
          className="inline-flex items-center gap-1.5 text-xs text-[#7A6670] hover:text-[#1C1218] transition-colors mb-2"
        >
          <ArrowLeft size={12} />
          Back to Messages
        </Link>
        <h1
          className="font-[family-name:var(--font-heading)] font-semibold text-[#1C1218] leading-tight"
          style={{ fontSize: "clamp(1rem, 2vw, 1.25rem)" }}
        >
          {otherUser.name}
        </h1>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {loading ? (
          <p className="text-center text-[#B0A0A8] text-sm pt-10">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-[#B0A0A8] text-sm pt-16">
            No messages yet — say hello to {otherUser.name}!
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col gap-1 ${msg.isMe ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.isMe
                    ? "bg-[#A8476A] text-white rounded-br-[4px]"
                    : "bg-[#F3EDE7] text-[#1C1218] rounded-bl-[4px]"
                }`}
              >
                {msg.content}
              </div>
              <p className="text-[10px] text-[#B0A0A8] px-1">
                {msg.isMe ? "You" : msg.senderName}
                {" · "}
                {new Date(msg.createdAt).toLocaleTimeString("en-US", {
                  hour:   "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 border-t border-black/[0.07] bg-white px-6 py-4">
        {error && (
          <p className="text-xs text-red-500 mb-2">{error}</p>
        )}
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            rows={1}
            placeholder={`Message ${otherUser.name}…`}
            onChange={(e) => { setInput(e.target.value); growTextarea() }}
            onKeyDown={handleKeyDown}
            className="flex-1 resize-none rounded-xl border border-black/[0.09] bg-[#FAF7F4] px-4 py-3 text-sm text-[#1C1218] placeholder:text-[#B0A0A8] focus:outline-none focus:border-[#A8476A]/40 focus:ring-2 focus:ring-[#A8476A]/10 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            aria-label="Send message"
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#A8476A] flex items-center justify-center text-white disabled:opacity-35 disabled:cursor-not-allowed hover:opacity-90 active:opacity-80 transition-opacity"
          >
            <Send size={15} />
          </button>
        </div>
        <p className="text-[10px] text-[#B0A0A8] mt-2 select-none">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
