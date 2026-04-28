"use client"

import { useState } from "react"
import { MapPin, Briefcase, Heart, X, Check } from "lucide-react"

interface Candidate {
  candidateId: string
  name:        string
  profession:  string | null
  location:    string | null
  bio:         string | null
  interests:   string[]
}

interface BrowseCardsProps {
  candidates: Candidate[]
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(" ")
  const letters =
    parts.length >= 2
      ? parts[0][0] + parts[parts.length - 1][0]
      : name.slice(0, 2)
  return (
    <div className="w-20 h-20 rounded-full bg-[#A8476A]/10 border border-[#A8476A]/20 flex items-center justify-center flex-shrink-0">
      <span className="font-[family-name:var(--font-heading)] font-bold text-2xl text-[#A8476A] tracking-tight">
        {letters.toUpperCase()}
      </span>
    </div>
  )
}

export function BrowseCards({ candidates }: BrowseCardsProps) {
  const [index, setIndex]     = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [results, setResults] = useState<Array<{ name: string; action: "INTERESTED" | "PASSED"; matched: boolean }>>([])

  const current = candidates[index]
  const done    = index >= candidates.length

  async function act(action: "INTERESTED" | "PASSED") {
    if (!current || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/discover/${current.candidateId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError((json as { error?: string }).error ?? "Something went wrong.")
        return
      }
      const { matched } = await res.json() as { matched: boolean }
      setResults((prev) => [...prev, { name: current.name, action, matched }])
      setIndex((i) => i + 1)
    } catch {
      setError("Network error — please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Empty state
  if (candidates.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-[#7A6670] text-sm leading-relaxed">
          Your matchmakers are curating today&rsquo;s introductions.<br />
          Check back later — new profiles are added each day.
        </p>
      </div>
    )
  }

  // All done
  if (done) {
    const interested = results.filter((r) => r.action === "INTERESTED")
    const matched    = results.filter((r) => r.matched)
    return (
      <div className="card p-10 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-[#A8476A]/10 border border-[#A8476A]/20 flex items-center justify-center mx-auto mb-4">
          <Check size={18} className="text-[#A8476A]" />
        </div>
        <p className="font-[family-name:var(--font-heading)] font-semibold text-[#1C1218] text-lg">
          You&rsquo;re all caught up.
        </p>
        <p className="text-[#7A6670] text-sm">
          {interested.length > 0
            ? `You expressed interest in ${interested.length} person${interested.length !== 1 ? "s" : ""}.`
            : "No interests expressed today."}
          {matched.length > 0 && (
            <span className="block mt-1 text-[#A8476A]">
              {matched.length} new match{matched.length !== 1 ? "es" : ""}!
            </span>
          )}
        </p>
        <p className="text-[#B0A0A8] text-xs pt-2">New introductions tomorrow.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-[#B0A0A8] mb-2">
        <span>{index + 1} of {candidates.length}</span>
        <span>{candidates.length - index - 1} remaining</span>
      </div>

      {/* Card */}
      <div className="card p-7 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Initials name={current.name} />
          <div>
            <h2 className="font-[family-name:var(--font-heading)] font-bold text-[#1C1218] text-xl tracking-tight">
              {current.name}
            </h2>
            <div className="flex flex-wrap gap-3 mt-1.5">
              {current.profession && (
                <span className="flex items-center gap-1 text-xs text-[#7A6670]">
                  <Briefcase size={12} /> {current.profession}
                </span>
              )}
              {current.location && (
                <span className="flex items-center gap-1 text-xs text-[#7A6670]">
                  <MapPin size={12} /> {current.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {current.bio && (
          <p className="text-[#7A6670] text-sm leading-relaxed border-t border-black/[0.06] pt-4">
            {current.bio}
          </p>
        )}

        {/* Interests */}
        {current.interests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {current.interests.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 rounded-full border border-black/[0.08] text-[#7A6670] bg-black/[0.02]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500/80 px-1">{error}</p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => act("PASSED")}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-black/[0.08] text-[#7A6670] hover:text-[#1C1218] hover:border-black/[0.16] hover:bg-black/[0.02] transition-all duration-150 text-sm font-medium disabled:opacity-40"
        >
          <X size={16} />
          Pass
        </button>
        <button
          onClick={() => act("INTERESTED")}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#A8476A]/10 border border-[#A8476A]/30 text-[#A8476A] hover:bg-[#A8476A]/20 transition-all duration-150 text-sm font-medium disabled:opacity-40"
        >
          <Heart size={16} />
          Interested
        </button>
      </div>
    </div>
  )
}
