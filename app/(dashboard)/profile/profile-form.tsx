"use client"

import { useState } from "react"
import { Eye, EyeOff, Check } from "lucide-react"

interface ProfileData {
  bio:        string
  profession: string
  employer:   string
  location:   string
  interests:  string[]
  isVisible:  boolean
}

interface ProfileFormProps {
  name:    string
  profile: ProfileData | null
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-[#7A6670] tracking-wide uppercase">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-[#B0A0A8]">{hint}</p>}
    </div>
  )
}

const INPUT = "w-full bg-white border border-black/[0.08] rounded-lg px-4 py-3 text-sm text-[#1C1218] placeholder-[#B0A0A8] outline-none focus:border-[rgba(168,71,106,0.4)] focus:ring-1 focus:ring-[rgba(168,71,106,0.15)] transition-all duration-200"

export function ProfileForm({ name, profile }: ProfileFormProps) {
  const empty: ProfileData = {
    bio:        "",
    profession: "",
    employer:   "",
    location:   "",
    interests:  [],
    isVisible:  true,
  }

  const initial = profile ?? empty

  const [bio,        setBio]        = useState(initial.bio)
  const [profession, setProfession] = useState(initial.profession)
  const [employer,   setEmployer]   = useState(initial.employer)
  const [location,   setLocation]   = useState(initial.location)
  const [interests,  setInterests]  = useState(initial.interests.join(", "))
  const [isVisible,  setIsVisible]  = useState(initial.isVisible)

  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)

    const interestsList = interests
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    try {
      const res = await fetch("/api/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio:        bio        || undefined,
          profession: profession || undefined,
          employer:   employer   || undefined,
          location:   location   || undefined,
          interests:  interestsList,
          isVisible,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError((json as { error?: string }).error ?? "Failed to save.")
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError("Network error — please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Name (read-only) */}
      <Field label="Full name" hint="Contact support to change your name.">
        <input
          type="text"
          value={name}
          disabled
          className={`${INPUT} opacity-40 cursor-not-allowed`}
        />
      </Field>

      <Field label="Profession">
        <input
          type="text"
          value={profession}
          onChange={(e) => setProfession(e.target.value)}
          placeholder="e.g. Software Engineer"
          maxLength={100}
          className={INPUT}
        />
      </Field>

      <Field label="Employer">
        <input
          type="text"
          value={employer}
          onChange={(e) => setEmployer(e.target.value)}
          placeholder="e.g. Google"
          maxLength={100}
          className={INPUT}
        />
      </Field>

      <Field label="City">
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Mumbai"
          maxLength={100}
          className={INPUT}
        />
      </Field>

      <Field label="Bio" hint={`${bio.length}/1000 characters`}>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A few sentences about yourself…"
          maxLength={1000}
          rows={4}
          className={`${INPUT} resize-none`}
        />
      </Field>

      <Field label="Interests" hint="Comma-separated, e.g. hiking, jazz, travel">
        <input
          type="text"
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          placeholder="hiking, jazz, travel"
          className={INPUT}
        />
      </Field>

      {/* Visibility toggle */}
      <Field label="Profile visibility">
        <button
          type="button"
          onClick={() => setIsVisible((v) => !v)}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg border border-black/[0.08] bg-white hover:border-black/[0.14] transition-colors text-sm text-left"
        >
          {isVisible ? (
            <Eye size={15} className="text-[#A8476A] flex-shrink-0" />
          ) : (
            <EyeOff size={15} className="text-[#B0A0A8] flex-shrink-0" />
          )}
          <div>
            <p className="text-[#1C1218] font-medium">
              {isVisible ? "Visible to others" : "Hidden from browse"}
            </p>
            <p className="text-xs text-[#7A6670] mt-0.5">
              {isVisible
                ? "You appear in daily queues."
                : "You won't be shown as an introduction."}
            </p>
          </div>
        </button>
      </Field>

      {error && (
        <p className="text-xs text-red-500/80">{error}</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-rose w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {saved ? (
          <>
            <Check size={15} />
            Saved
          </>
        ) : saving ? (
          "Saving…"
        ) : (
          "Save changes"
        )}
      </button>
    </div>
  )
}
