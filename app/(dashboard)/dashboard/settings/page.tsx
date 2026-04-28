import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { SettingsClient } from "./settings-client"

export default async function SettingsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const user = await db.user.findUnique({
    where:  { id: session.user.id },
    select: { passwordHash: true },
  })

  const hasPassword = !!user?.passwordHash

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 md:px-10 md:py-12">
      <div className="mb-10">
        <div className="ornament" aria-hidden="true">
          <span className="ornament-dot">✦</span>
        </div>
        <h1
          className="font-[family-name:var(--font-heading)] font-bold text-[#1C1218] tracking-[-0.03em] leading-tight mb-1.5"
          style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)" }}
        >
          Settings.
        </h1>
        <p className="text-[#7A6670] text-sm">Manage your account.</p>
      </div>

      <SettingsClient
        name={session.user.name}
        email={session.user.email}
        hasPassword={hasPassword}
      />
    </div>
  )
}
