import Link from "next/link"
import { LoginForm } from "./login-form"

export default function LoginPage() {
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
          href="/signup"
          className="text-sm text-[#7A6670] hover:text-[#1C1218] transition-colors duration-200"
        >
          Apply for membership <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* Card */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <LoginForm />
      </div>

    </div>
  )
}
