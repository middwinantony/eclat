"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { motion } from "framer-motion"
import { Eye, EyeOff, ArrowRight, ShieldCheck, Link2 } from "lucide-react"
import { signupSchema, type SignupInput } from "@/lib/validators/auth"

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-xs text-red-500/80">{message}</p>
}

const INPUT = "w-full bg-white border border-black/[0.08] rounded-lg px-4 py-3 text-sm text-[#1C1218] placeholder-[#B0A0A8] outline-none focus:border-[rgba(168,71,106,0.4)] focus:ring-1 focus:ring-[rgba(168,71,106,0.15)] transition-all duration-200"

const PASSWORD_HINTS = [
  "8+ characters",
  "One uppercase letter",
  "One number",
  "One special character (!@#$…)",
]

const GENDER_OPTIONS = [
  { value: "MALE",             label: "Male"             },
  { value: "FEMALE",           label: "Female"           },
  { value: "NON_BINARY",       label: "Non-binary"       },
  { value: "PREFER_NOT_TO_SAY",label: "Prefer not to say"},
] as const

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError]   = useState<string | null>(null)
  const [loading, setLoading]           = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { acceptTerms: undefined as unknown as true },
  })

  const password    = watch("password", "")
  const gender      = watch("gender")
  const isMale      = gender === "MALE"

  const passwordStrength = {
    length:  password.length >= 8,
    upper:   /[A-Z]/.test(password),
    number:  /[0-9]/.test(password),
    special: /[!@#$%^&*()_\-=+[\]{}<>:?]/.test(password),
  }
  const strengthCount = Object.values(passwordStrength).filter(Boolean).length

  function strengthColor(index: number) {
    if (index >= strengthCount) return "rgba(0,0,0,0.08)"
    if (strengthCount <= 1) return "#E53E3E"
    if (strengthCount <= 2) return "#D69E2E"
    if (strengthCount === 3) return "#A8476A"
    return "#48BB78"
  }

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
        setServerError((json as { error?: string }).error ?? "Something went wrong. Please try again.")
        return
      }
      window.location.href = "/signup/confirmation"
    } catch {
      setServerError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4] flex flex-col">

      {/* Background bloom */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(168,71,106,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" className="flex items-center gap-1.5 group">
          <span className="font-[family-name:var(--font-heading)] font-bold text-lg tracking-[-0.04em] text-[#1C1218] group-hover:text-[#A8476A] transition-colors duration-200">
            eclat
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#A8476A] mb-1.5 opacity-80" aria-hidden="true" />
        </Link>
        <Link
          href="/login"
          className="text-sm text-[#7A6670] hover:text-[#1C1218] transition-colors duration-200"
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
          <div className="rounded-2xl border border-black/[0.07] bg-white p-8 md:p-10 shadow-sm">

            {/* Header */}
            <div className="mb-8">
              <span className="block w-8 h-px bg-[#A8476A] mb-5 opacity-70" aria-hidden="true" />
              <h1
                className="font-[family-name:var(--font-heading)] font-bold text-[#1C1218] tracking-[-0.03em] leading-tight mb-2"
                style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)" }}
              >
                Apply for membership.
              </h1>
              <p className="text-[#7A6670] text-sm leading-relaxed">
                Every application is reviewed by our team within 48 hours.
              </p>
            </div>

            {/* Server error */}
            {serverError && (
              <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">

              {/* Full name */}
              <div>
                <label htmlFor="name" className="block text-xs font-medium text-[#7A6670] tracking-wide uppercase mb-2">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Arjun Mehta"
                  {...register("name")}
                  className={INPUT}
                />
                <FieldError message={errors.name?.message} />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-[#7A6670] tracking-wide uppercase mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...register("email")}
                  className={INPUT}
                />
                <FieldError message={errors.email?.message} />
              </div>

              {/* Date of birth */}
              <div>
                <label htmlFor="dateOfBirth" className="block text-xs font-medium text-[#7A6670] tracking-wide uppercase mb-2">
                  Date of Birth
                </label>
                <input
                  id="dateOfBirth"
                  type="date"
                  autoComplete="bday"
                  {...register("dateOfBirth")}
                  className={`${INPUT} [color-scheme:light]`}
                />
                <FieldError message={errors.dateOfBirth?.message} />
              </div>

              {/* Gender */}
              <div>
                <p className="block text-xs font-medium text-[#7A6670] tracking-wide uppercase mb-2">
                  I identify as
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {GENDER_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setValue("gender", value, { shouldValidate: true })}
                      className={`py-2.5 px-4 rounded-lg border text-sm font-medium transition-all duration-150 text-left ${
                        gender === value
                          ? "border-[#A8476A] bg-[#A8476A]/[0.06] text-[#A8476A]"
                          : "border-black/[0.08] bg-white text-[#7A6670] hover:border-[#A8476A]/40"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <FieldError message={errors.gender?.message} />
              </div>

              {/* LinkedIn — required for male applicants */}
              {isMale && (
                <div>
                  <label htmlFor="linkedinUrl" className="block text-xs font-medium text-[#7A6670] tracking-wide uppercase mb-2">
                    LinkedIn Profile
                  </label>
                  <div className="relative">
                    <Link2
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0A0A8]"
                    />
                    <input
                      id="linkedinUrl"
                      type="url"
                      placeholder="https://linkedin.com/in/your-profile"
                      {...register("linkedinUrl")}
                      className={`${INPUT} pl-9`}
                    />
                  </div>
                  <p className="mt-1.5 text-[0.65rem] text-[#B0A0A8] tracking-wide">
                    Required for male applicants. Used to verify professional background.
                  </p>
                  <FieldError message={errors.linkedinUrl?.message} />
                </div>
              )}

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-[#7A6670] tracking-wide uppercase mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...register("password")}
                    className={`${INPUT} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0A0A8] hover:text-[#7A6670] transition-colors"
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
                        style={{ background: strengthColor(i) }}
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
                        style={{ color: passed ? "#A8476A" : "#B0A0A8" }}
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
                    className="mt-0.5 w-4 h-4 rounded border border-black/[0.15] bg-white accent-[#A8476A] cursor-pointer"
                  />
                  <span className="text-xs text-[#7A6670] leading-relaxed group-hover:text-[#1C1218] transition-colors duration-200">
                    I am 18 or older and agree to the{" "}
                    <Link href="/terms" className="text-[#A8476A] hover:underline underline-offset-2">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-[#A8476A] hover:underline underline-offset-2">
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
                className="btn-rose w-full mt-1 py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
            <div className="mt-7 flex items-start gap-3 p-4 rounded-lg bg-[#A8476A]/[0.05] border border-[#A8476A]/[0.12]">
              <ShieldCheck size={14} className="text-[#A8476A] opacity-70 mt-0.5 shrink-0" />
              <p className="text-[#7A6670] text-xs leading-relaxed">
                After submission, you&rsquo;ll complete identity verification before gaining access.
                Your data is encrypted and never shared.
              </p>
            </div>

          </div>

          {/* Footer note */}
          <p className="mt-6 text-center text-[#7A6670] text-xs tracking-wide">
            Already a member?{" "}
            <Link href="/login" className="text-[#A8476A] hover:underline underline-offset-2">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
