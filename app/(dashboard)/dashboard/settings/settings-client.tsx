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

const PASSWORD_CRITERIA = [
  { label: "8+ characters",          test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter",   test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number",             test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character",  test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function strengthBarColor(passed: number, index: number): string {
  if (index >= passed) return "rgba(0,0,0,0.08)"
  if (passed <= 1)     return "#E53E3E"
  if (passed <= 2)     return "#D69E2E"
  if (passed === 3)    return "#A8476A"
  return "#48BB78"
}

function Section({
  title,
  children,
  danger,
}: {
  title:    string
  children: React.ReactNode
  danger?:  boolean
}) {
  return (
    <div
      className={`p-6 space-y-5 rounded-[1.25rem] bg-white ${
        danger
          ? "border border-red-200 shadow-[0_0_0_1px_rgba(239,68,68,0.06)]"
          : "card"
      }`}
    >
      <h2
        className={`font-[family-name:var(--font-heading)] font-semibold text-base tracking-tight ${
          danger ? "text-red-600" : "text-[#1C1218]"
        }`}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

function ReadOnlyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-[#7A6670] tracking-wide uppercase">{label}</label>
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
  label:         string
  value:         string
  onChange:      (v: string) => void
  placeholder?:  string
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
  // ── Password section ──────────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState("")
  const [newPw,     setNewPw]     = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [pwSaving,  setPwSaving]  = useState(false)
  const [pwSaved,   setPwSaved]   = useState(false)
  const [pwError,   setPwError]   = useState<string | null>(null)
  const [showNewPw, setShowNewPw] = useState(false)

  // ── Delete section ────────────────────────────────────────────────────────
  const [deleteConfirm,   setDeleteConfirm]   = useState("")
  const [deletePassword,  setDeletePassword]  = useState("")
  const [deleteDeleting,  setDeleteDeleting]  = useState(false)
  const [deleteError,     setDeleteError]     = useState<string | null>(null)

  // Password strength
  const criteria   = PASSWORD_CRITERIA.map((c) => ({ ...c, passed: c.test(newPw) }))
  const passedCount = criteria.filter((c) => c.passed).length

  async function handlePasswordChange() {
    setPwError(null)
    if (newPw !== confirmPw) {
      setPwError("New passwords do not match.")
      return
    }
    setPwSaving(true)
    try {
      const res  = await fetch("/api/settings/password", {
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
    setDeleteError(null)
    if (deleteConfirm !== "DELETE") {
      setDeleteError("Type DELETE (all caps) to confirm.")
      return
    }
    if (hasPassword && !deletePassword) {
      setDeleteError("Enter your password to confirm.")
      return
    }
    setDeleteDeleting(true)
    try {
      const res = await fetch("/api/settings/delete", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          confirmation: deleteConfirm,
          ...(hasPassword ? { password: deletePassword } : {}),
        }),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        setDeleteError(json.error ?? "Failed to delete account.")
        setDeleteDeleting(false)
        return
      }
      await signOut({ callbackUrl: "/" })
    } catch {
      setDeleteError("Network error — please try again.")
      setDeleteDeleting(false)
    }
  }

  const deleteReady = deleteConfirm === "DELETE" && (!hasPassword || deletePassword.length > 0)

  return (
    <div className="space-y-5">

      {/* ── Account info ──────────────────────────────────────────────────── */}
      <Section title="Account">
        <ReadOnlyField label="Full name" value={name} hint="Contact support to update your name." />
        <ReadOnlyField label="Email"     value={email} hint="Contact support to change your email address." />
      </Section>

      {/* ── Change password ───────────────────────────────────────────────── */}
      <Section title="Change password">
        {!hasPassword ? (
          <div className="flex items-start gap-3 rounded-lg border border-[#A8476A]/20 bg-[#A8476A]/[0.05] p-4">
            <span className="mt-px text-[#A8476A] text-xs font-bold tracking-widest opacity-70 shrink-0">G</span>
            <p className="text-sm text-[#7A6670] leading-relaxed">
              Your account uses Google sign-in. Password change is not available.
            </p>
          </div>
        ) : (
          <>
            <PasswordField
              label="Current password"
              value={currentPw}
              onChange={setCurrentPw}
              autoComplete="current-password"
            />

            {/* New password — inline so we can attach the strength indicator */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#7A6670] tracking-wide uppercase">
                New password
              </label>
              <div className="relative">
                <input
                  type={showNewPw ? "text" : "password"}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  className={`${INPUT} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A0A8] hover:text-[#7A6670] transition-colors"
                  aria-label={showNewPw ? "Hide" : "Show"}
                >
                  {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {newPw.length > 0 && (
                <>
                  {/* Strength bars */}
                  <div className="flex gap-1 mt-2.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex-1 h-0.5 rounded-full transition-colors duration-300"
                        style={{ background: strengthBarColor(passedCount, i) }}
                      />
                    ))}
                  </div>
                  {/* Criteria hints */}
                  <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                    {criteria.map((c) => (
                      <li
                        key={c.label}
                        className="flex items-center gap-1.5 text-[0.65rem] tracking-wide transition-colors duration-200"
                        style={{ color: c.passed ? "#A8476A" : "#B0A0A8" }}
                      >
                        <span>{c.passed ? "✓" : "·"}</span>
                        {c.label}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <PasswordField
              label="Confirm new password"
              value={confirmPw}
              onChange={setConfirmPw}
              autoComplete="new-password"
            />

            {pwError && <p className="text-xs text-red-500/80">{pwError}</p>}

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
          </>
        )}
      </Section>

      {/* ── Danger zone ───────────────────────────────────────────────────── */}
      <Section title="Danger zone" danger>
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={15} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-[#7A6670] leading-relaxed">
            This permanently deactivates your account. Your data is retained for compliance
            purposes but your profile will be hidden and you will not be able to log in.
            Active subscriptions are not automatically cancelled — manage those under{" "}
            <a href="/dashboard/billing" className="text-[#A8476A] hover:underline underline-offset-2">
              Billing
            </a>{" "}
            first.
          </p>
        </div>

        {hasPassword && (
          <PasswordField
            label="Your password"
            value={deletePassword}
            onChange={setDeletePassword}
            placeholder="Enter your password"
            autoComplete="current-password"
          />
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-[#7A6670] tracking-wide uppercase">
            Type DELETE to confirm
          </label>
          <input
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="DELETE"
            spellCheck={false}
            autoComplete="off"
            className={INPUT}
          />
        </div>

        {deleteError && <p className="text-xs text-red-500/80">{deleteError}</p>}

        <button
          onClick={handleDeleteAccount}
          disabled={deleteDeleting || !deleteReady}
          className="py-2.5 px-5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
        >
          {deleteDeleting ? "Deleting account…" : "Delete Account"}
        </button>
      </Section>

    </div>
  )
}
