"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { motion } from "framer-motion"
import { Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react"
import { signupSchema, type SignupInput } from "@/lib/validators/auth"

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-xs text-red-400/80">{message}</p>
}

const PASSWORD_HINTS = [
  "8+ characters",
  "One uppercase letter",
  "One number",
  "One special character (!@#$…)",
]

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { acceptTerms: undefined as unknown as true },
  })

  const password = watch("password", "")

  const passwordStrength = {
    length:    password.length >= 8,
    upper:     /[A-Z]/.test(password),
    number:    /[0-9]/.test(password),
    special:   /[!@#$%^&*()_\-=+[\]{}<>:?]/.test(password),
  }
  const strengthCount = Object.values(passwordStrength).filter(Boolean).length

  async function onSubmit(data: SignupInput) {
    setLoading(true)
    setServerError(null)
    try {
      const res = await fetch("/api/auth/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        setServerError(json.error ?? "Something went wrong. Please try again.")
        return
      }
      // Redirect to a confirmation page
      window.location.href = "/signup/confirmation"
    } catch {
      setServerError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">

      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 70%)",
        }}
      />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" className="flex items-center gap-1.5 group">
          <span className="font-[family-name:var(--font-heading)] font-bold text-lg tracking-[-0.04em] text-[#F5F0E8] group-hover:text-[#C9A84C] transition-colors duration-200">
            eclat
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] mb-1.5 opacity-80" aria-hidden="true" />
        </Link>
        <Link
          href="/login"
          className="text-sm text-[#555555] hover:text-[#F5F0E8] transition-colors duration-200"
        >
          Already a member? Sign in
        </Link>
      </div>

      {/* Centred card */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-lg"
        >
          {/* Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0D0D0D] p-8 md:p-10">

            {/* Header */}
            <div className="mb-8">
              <span className="block w-8 h-px bg-[#C9A84C] mb-5 opacity-70" aria-hidden="true" />
              <h1
                className="font-[family-name:var(--font-heading)] font-bold text-[#F5F0E8] tracking-[-0.03em] leading-tight mb-2"
                style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)" }}
              >
                Apply for membership.
              </h1>
              <p className="text-[#555555] text-sm leading-relaxed">
                Every application is reviewed by our team within 48 hours.
              </p>
            </div>

            {/* Server error */}
            {serverError && (
              <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">

              {/* Full name */}
              <div>
                <label htmlFor="name" className="block text-xs font-medium text-[#888888] tracking-wide uppercase mb-2">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Arjun Mehta"
                  {...register("name")}
                  className="w-full bg-[#111111] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-[#F5F0E8] placeholder-[#333333] outline-none focus:border-[rgba(201,168,76,0.4)] focus:ring-1 focus:ring-[rgba(201,168,76,0.2)] transition-all duration-200"
                />
                <FieldError message={errors.name?.message} />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-[#888888] tracking-wide uppercase mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...register("email")}
                  className="w-full bg-[#111111] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-[#F5F0E8] placeholder-[#333333] outline-none focus:border-[rgba(201,168,76,0.4)] focus:ring-1 focus:ring-[rgba(201,168,76,0.2)] transition-all duration-200"
                />
                <FieldError message={errors.email?.message} />
              </div>

              {/* Date of birth */}
              <div>
                <label htmlFor="dateOfBirth" className="block text-xs font-medium text-[#888888] tracking-wide uppercase mb-2">
                  Date of Birth
                </label>
                <input
                  id="dateOfBirth"
                  type="date"
                  autoComplete="bday"
                  {...register("dateOfBirth")}
                  className="w-full bg-[#111111] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-[#F5F0E8] placeholder-[#333333] outline-none focus:border-[rgba(201,168,76,0.4)] focus:ring-1 focus:ring-[rgba(201,168,76,0.2)] transition-all duration-200 [color-scheme:dark]"
                />
                <FieldError message={errors.dateOfBirth?.message} />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-[#888888] tracking-wide uppercase mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...register("password")}
                    className="w-full bg-[#111111] border border-white/[0.08] rounded-lg px-4 py-3 pr-11 text-sm text-[#F5F0E8] placeholder-[#333333] outline-none focus:border-[rgba(201,168,76,0.4)] focus:ring-1 focus:ring-[rgba(201,168,76,0.2)] transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444444] hover:text-[#888888] transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* Strength bar */}
                {password.length > 0 && (
                  <div className="mt-2.5 flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex-1 h-0.5 rounded-full transition-colors duration-300"
                        style={{
                          background:
                            i < strengthCount
                              ? strengthCount <= 1
                                ? "#E53E3E"
                                : strengthCount <= 2
                                ? "#D69E2E"
                                : strengthCount === 3
                                ? "#C9A84C"
                                : "#48BB78"
                              : "rgba(255,255,255,0.08)",
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Hints */}
                <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  {PASSWORD_HINTS.map((hint, i) => {
                    const passed = Object.values(passwordStrength)[i]
                    return (
                      <li
                        key={hint}
                        className="flex items-center gap-1.5 text-[0.65rem] tracking-wide transition-colors duration-200"
                        style={{ color: passed ? "#C9A84C" : "#444444" }}
                      >
                        <span>{passed ? "✓" : "·"}</span>
                        {hint}
                      </li>
                    )
                  })}
                </ul>

                <FieldError message={errors.password?.message} />
              </div>

              {/* Accept terms */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    {...register("acceptTerms")}
                    className="mt-0.5 w-4 h-4 rounded border border-white/[0.15] bg-[#111111] accent-[#C9A84C] cursor-pointer"
                  />
                  <span className="text-xs text-[#555555] leading-relaxed group-hover:text-[#888888] transition-colors duration-200">
                    I am 18 or older and agree to the{" "}
                    <Link href="/terms" className="text-[#C9A84C] hover:underline underline-offset-2">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-[#C9A84C] hover:underline underline-offset-2">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
                <FieldError message={errors.acceptTerms?.message} />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-gold w-full mt-1 py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? "Submitting application…" : (
                  <>
                    Submit Application
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

            </form>

            {/* Verification note */}
            <div className="mt-7 flex items-start gap-3 p-4 rounded-lg bg-[rgba(201,168,76,0.05)] border border-[rgba(201,168,76,0.1)]">
              <ShieldCheck size={14} className="text-[#C9A84C] opacity-70 mt-0.5 shrink-0" />
              <p className="text-[#555555] text-xs leading-relaxed">
                After submission, you&rsquo;ll complete identity verification before gaining access.
                Your data is encrypted and never shared.
              </p>
            </div>

          </div>

          {/* Footer note */}
          <p className="mt-6 text-center text-[#333333] text-xs tracking-wide">
            Already a member?{" "}
            <Link href="/login" className="text-[#C9A84C] hover:underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
