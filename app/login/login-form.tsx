"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signIn } from "next-auth/react"
import { motion } from "framer-motion"
import { Eye, EyeOff, ArrowRight } from "lucide-react"
import { loginSchema, type LoginInput } from "@/lib/validators/auth"

const INPUT = "w-full bg-white border border-black/[0.08] rounded-lg px-4 py-3 text-sm text-[#1C1218] placeholder-[#B0A0A8] outline-none focus:border-[rgba(168,71,106,0.4)] focus:ring-1 focus:ring-[rgba(168,71,106,0.15)] transition-all duration-200"

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-xs text-red-500/80">{message}</p>
}

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError]   = useState<string | null>(null)
  const [loading, setLoading]           = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginInput) {
    setLoading(true)
    setServerError(null)
    try {
      const result = await signIn("credentials", {
        email:    data.email,
        password: data.password,
        redirect: false,
      })
      if (result?.error) {
        setServerError("Invalid email or password.")
        return
      }
      window.location.href = "/dashboard"
    } catch {
      setServerError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-md"
    >
      {/* Card */}
      <div className="rounded-2xl border border-black/[0.07] bg-white p-8 md:p-10 shadow-sm">

        {/* Header */}
        <div className="mb-8">
          <span className="block w-8 h-px bg-[#A8476A] mb-5 opacity-70" aria-hidden="true" />
          <h1
            className="font-[family-name:var(--font-heading)] font-bold text-[#1C1218] tracking-[-0.03em] leading-tight mb-2"
            style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)" }}
          >
            Welcome back.
          </h1>
          <p className="text-[#7A6670] text-sm">
            Sign in to your eclat account.
          </p>
        </div>

        {/* Server error */}
        {serverError && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">

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

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-xs font-medium text-[#7A6670] tracking-wide uppercase">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#7A6670] hover:text-[#A8476A] transition-colors duration-200"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
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
            <FieldError message={errors.password?.message} />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-rose w-full mt-2 py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? "Signing in…" : (
              <>
                Sign In
                <ArrowRight size={15} />
              </>
            )}
          </button>

        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-7">
          <div className="flex-1 h-px bg-black/[0.06]" />
          <span className="text-[#B0A0A8] text-xs tracking-wide">or</span>
          <div className="flex-1 h-px bg-black/[0.06]" />
        </div>

        {/* Google SSO */}
        <button
          type="button"
          className="btn-ghost w-full py-3 text-sm flex items-center justify-center gap-3"
          onClick={async () => {
            try {
              await signIn("google", { callbackUrl: "/dashboard" })
            } catch (err) {
              console.error("Google sign-in error:", err)
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

      </div>

      {/* Footer note */}
      <p className="mt-6 text-center text-[#7A6670] text-xs tracking-wide">
        Don&rsquo;t have an account?{" "}
        <Link href="/signup" className="text-[#A8476A] hover:underline underline-offset-2">
          Apply for membership
        </Link>
      </p>
    </motion.div>
  )
}
