"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import { Eye, EyeOff, Check, AlertTriangle } from "lucide-react"

interface Props {
  name:        string
  email:       string
  hasPassword: boolean
}

const INPUT = "w-full bg-white border border-black/[0.08] rounded-lg px-4 py-3 text-sm text-[#1C1218] placeholder-[#B0A0A8] outline-none focus:border-[rgba(168,71,106,0.4)] focus:ring-1 focus:ring-[rgba(168,71,106,0.15)] transition-all duration-200"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6 space-y-5">
      <h2 className="font-[family-name:var(--font-heading)] font-semibold text-[#1C1218] text-base tracking-tight">
        {title}
      </h2>
      {children}
    </div>
  )
}

function ReadOnlyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-[#7A6670] tracking-wide uppercase">
        {label}
      </label>
      <input type="text" value={value} disabled className={`${INPUT} opacity-40 cursor-not-allowed`} />
      {hint && <p className="text-xs text-[#B0A0A8]">{hint}</p>}
    </div>
  )
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-[#7A6670] tracking-wide uppercase">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "••••••••"}
          autoComplete={autoComplete}
          className={`${INPUT} pr-11`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A0A8] hover:text-[#7A6670] transition-colors"
          aria-label={show ? "Hide" : "Show"}
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )
}

export function SettingsClient({ name, email, hasPassword }: Props) {
  const [currentPw,  setCurrentPw]  = useState("")
  const [newPw,      setNewPw]      = useState("")
  const [confirmPw,  setConfirmPw]  = useState("")
  const [pwSaving,   setPwSaving]   = useState(false)
  const [pwSaved,    setPwSaved]    = useState(false)
  const [pwError,    setPwError]    = useState<string | null>(null)

  const [deletePhase,  setDeletePhase]  = useState<"idle" | "confirm" | "deleting">("idle")
  const [deleteError,  setDeleteError]  = useState<string | null>(null)

  async function handlePasswordChange() {
    if (newPw !== confirmPw) {
      setPwError("New passwords do not match.")
      return
    }
    if (newPw.length < 8) {
      setPwError("New password must be at least 8 characters.")
      return
    }
    setPwSaving(true)
    setPwError(null)
    try {
      const res = await fetch("/api/settings/password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) {
        setPwError(json.error ?? "Failed to update password.")
        return
      }
      setPwSaved(true)
      setCurrentPw(""); setNewPw(""); setConfirmPw("")
      setTimeout(() => setPwSaved(false), 3000)
    } catch {
      setPwError("Network error — please try again.")
    } finally {
      setPwSaving(false)
    }
  }

  async function handleDeleteAccount() {
    setDeletePhase("deleting")
    setDeleteError(null)
    try {
      const res = await fetch("/api/settings/delete", { method: "POST" })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        setDeleteError(json.error ?? "Failed to delete account.")
        setDeletePhase("confirm")
        return
      }
      await signOut({ callbackUrl: "/" })
    } catch {
      setDeleteError("Network error — please try again.")
      setDeletePhase("confirm")
    }
  }

  return (
    <div className="space-y-5">
      {/* Account info */}
      <Section title="Account">
        <ReadOnlyField label="Full name" value={name} hint="Contact support to update your name." />
        <ReadOnlyField label="Email"     value={email} hint="Contact support to change your email address." />
      </Section>

      {/* Change password */}
      {hasPassword && (
        <Section title="Change password">
          <PasswordField
            label="Current password"
            value={currentPw}
            onChange={setCurrentPw}
            autoComplete="current-password"
          />
          <PasswordField
            label="New password"
            value={newPw}
            onChange={setNewPw}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm new password"
            value={confirmPw}
            onChange={setConfirmPw}
            autoComplete="new-password"
          />
          {pwError && (
            <p className="text-xs text-red-500/80">{pwError}</p>
          )}
          <button
            onClick={handlePasswordChange}
            disabled={pwSaving || !currentPw || !newPw || !confirmPw}
            className="btn-rose py-3 px-6 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          >
            {pwSaved ? (
              <><Check size={14} /> Password updated</>
            ) : pwSaving ? (
              "Updating…"
            ) : (
              "Update password"
            )}
          </button>
        </Section>
      )}

      {/* Danger zone */}
      <Section title="Danger zone">
        <p className="text-[#7A6670] text-sm leading-relaxed">
          Deleting your account removes your profile from all browse queues immediately.
          Your data is retained for 30 days, after which it is permanently erased.
          Active subscriptions are not automatically cancelled — manage those under{" "}
          <a href="/dashboard/billing" className="text-[#A8476A] hover:underline underline-offset-2">
            Billing
          </a>{" "}
          first.
        </p>

        {deletePhase === "idle" && (
          <button
            onClick={() => setDeletePhase("confirm")}
            className="btn-ghost py-2.5 px-5 text-sm text-red-500 border-red-300 hover:border-red-400 hover:bg-red-50"
          >
            Delete my account
          </button>
        )}

        {deletePhase === "confirm" && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 font-medium">
                Are you sure? This cannot be undone.
              </p>
            </div>
            {deleteError && (
              <p className="text-xs text-red-500/80">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeletePhase("idle"); setDeleteError(null) }}
                className="btn-ghost py-2 px-4 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="py-2 px-4 rounded-lg bg-red-100 border border-red-300 text-red-600 text-sm font-medium hover:bg-red-200 transition-colors"
              >
                Yes, delete my account
              </button>
            </div>
          </div>
        )}

        {deletePhase === "deleting" && (
          <p className="text-sm text-[#7A6670]">Deleting account…</p>
        )}
      </Section>
    </div>
  )
}
