import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { ProfileForm } from "./profile-form"

export default async function ProfilePage() {
  const session = await auth()
  if (!session) redirect("/login")

  const profile = await db.profile.findUnique({
    where: { userId: session.user.id },
  })

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 md:px-10 md:py-12">
      <div className="mb-8">
        <div className="ornament" aria-hidden="true">
          <span className="ornament-dot">✦</span>
        </div>
        <h1
          className="font-[family-name:var(--font-heading)] font-bold text-[#1C1218] tracking-[-0.03em] leading-tight mb-1.5"
          style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)" }}
        >
          Your profile.
        </h1>
        <p className="text-[#7A6670] text-sm">
          This is what other members see when you&rsquo;re introduced.
        </p>
      </div>

      <ProfileForm
        name={session.user.name}
        profile={
          profile
            ? {
                bio:        profile.bio        ?? "",
                profession: profile.profession ?? "",
                employer:   profile.employer   ?? "",
                location:   profile.location   ?? "",
                interests:  profile.interests  ?? [],
                isVisible:  profile.isVisible,
              }
            : null
        }
      />
    </div>
  )
}
