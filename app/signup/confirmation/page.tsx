import Link from "next/link"
import { ShieldCheck } from "lucide-react"

export default function SignupConfirmationPage() {
  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center px-4">
      {/* Background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.2)]">
            <ShieldCheck size={24} className="text-[#C9A84C]" strokeWidth={1.5} />
          </div>
        </div>

        <span className="block w-8 h-px bg-[#C9A84C] mx-auto mb-6 opacity-70" aria-hidden="true" />

        <h1
          className="font-[family-name:var(--font-heading)] font-bold text-[#F5F0E8] tracking-[-0.03em] leading-tight mb-4"
          style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)" }}
        >
          Application received.
        </h1>

        <p className="text-[#555555] text-sm leading-relaxed mb-8 max-w-sm mx-auto">
          Our team will review your application within 48 hours. You&rsquo;ll receive an email
          once a decision has been made. In the meantime, there&rsquo;s nothing to do — just wait.
        </p>

        <p className="text-[#333333] text-xs tracking-wide">
          Not for everyone.{" "}
          <span className="text-[#444444]">Intentionally.</span>
        </p>

        <Link
          href="/"
          className="mt-10 inline-block text-xs text-[#444444] hover:text-[#888888] transition-colors duration-200"
        >
          ← Back to eclat
        </Link>
      </div>
    </div>
  )
}
