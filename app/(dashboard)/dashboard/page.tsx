import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { MembershipTier } from "@prisma/client"
import {
  Compass,
  Heart,
  MessageSquare,
  Clock,
  AlertCircle,
  XCircle,
} from "lucide-react"

// ── helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const hour = (new Date().getUTCHours() + 5.5) % 24
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function tierSubtitle(tier: MembershipTier | null, isVerified: boolean): string {
  if (!isVerified) return "Welcome to eclat."
  if (!tier) return "No active subscription — visit Billing to get started."
  const map: Record<MembershipTier, string> = {
    SELECT:  "3 curated introductions per day",
    RESERVE: "15 curated introductions per day",
    NOIR:    "Unlimited curated introductions per day",
  }
  return map[tier]
}

// ── components ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  note,
  rose,
}: {
  label: string
  value: number | string
  note: string
  rose?: boolean
}) {
  return (
    <div className="rounded-xl border border-black/[0.07] bg-white p-5">
      <p className="text-[#B0A0A8] text-xs font-medium uppercase tracking-wide mb-2">{label}</p>
      <p
        className={`font-[family-name:var(--font-heading)] font-bold text-2xl tracking-tight ${
          rose ? "text-[#A8476A]" : "text-[#1C1218]"
        }`}
      >
        {value}
      </p>
      <p className="text-[#B0A0A8] text-xs mt-1">{note}</p>
    </div>
  )
}

function ActionCard({
  href,
  icon: Icon,
  title,
  description,
  dimmed,
}: {
  href: string
  icon: React.ElementType
  title: string
  description: string
  dimmed?: boolean
}) {
  return (
    <Link
      href={href}
      aria-disabled={dimmed}
      className={`group flex flex-col gap-3 rounded-xl border p-5 transition-all duration-200 ${
        dimmed
          ? "border-black/[0.05] bg-white opacity-40 pointer-events-none"
          : "border-black/[0.07] bg-white hover:border-[#A8476A]/30 hover:bg-[#A8476A]/[0.04]"
      }`}
    >
      <Icon
        size={20}
        className={dimmed ? "text-[#B0A0A8]" : "text-[#A8476A]"}
      />
      <div>
        <p className="font-semibold text-sm text-[#1C1218]">{title}</p>
        <p className="text-xs text-[#7A6670] mt-0.5">{description}</p>
      </div>
    </Link>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const { user } = session
  const isVerified = user.verificationStatus === "VERIFIED"

  let queueCount = 0
  let activeMatchCount = 0

  if (isVerified) {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    ;[queueCount, activeMatchCount] = await Promise.all([
      db.dailyQueue.count({
        where: { userId: user.id, date: today, action: "UNSEEN" },
      }),
      db.match.count({
        where: {
          OR: [{ user1Id: user.id }, { user2Id: user.id }],
          status: "ACTIVE",
        },
      }),
    ])
  }

  type StatusKey = "PENDING" | "IN_REVIEW" | "REJECTED"
  const verificationBanners: Record<
    StatusKey,
    { icon: React.ElementType; color: string; bg: string; title: string; message: string }
  > = {
    PENDING: {
      icon:    Clock,
      color:   "text-amber-600",
      bg:      "bg-amber-50 border-amber-200",
      title:   "Application under review",
      message: "Our team is verifying your profile. This typically takes 2–3 business days. We'll email you once your account is approved.",
    },
    IN_REVIEW: {
      icon:    AlertCircle,
      color:   "text-blue-600",
      bg:      "bg-blue-50 border-blue-200",
      title:   "Actively being reviewed",
      message: "Your profile is being reviewed by our matchmaking team right now. You'll receive an email very shortly.",
    },
    REJECTED: {
      icon:    XCircle,
      color:   "text-red-600",
      bg:      "bg-red-50 border-red-200",
      title:   "Application not approved",
      message: "Your application was not approved at this time. Please contact our support team for more information.",
    },
  }

  const banner =
    user.verificationStatus !== "VERIFIED"
      ? verificationBanners[user.verificationStatus as StatusKey]
      : null

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 md:px-10 md:py-12">

      {/* Background bloom */}
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 60% 0%, rgba(168,71,106,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-10">
          <div className="ornament" aria-hidden="true">
            <span className="ornament-dot">✦</span>
          </div>
          <h1
            className="font-[family-name:var(--font-heading)] font-bold text-[#1C1218] tracking-[-0.03em] leading-tight mb-1.5"
            style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)" }}
          >
            {greeting()}, {user.name.split(" ")[0]}.
          </h1>
          <p className="text-[#7A6670] text-sm">
            {tierSubtitle(user.membershipTier, isVerified)}
          </p>
        </div>

        {/* Verification status banner */}
        {banner && (() => {
          const StatusIcon = banner.icon
          return (
            <div className={`flex gap-4 p-5 rounded-xl border mb-8 ${banner.bg}`}>
              <StatusIcon
                size={20}
                className={`flex-shrink-0 mt-0.5 ${banner.color}`}
              />
              <div>
                <p className={`font-semibold text-sm ${banner.color}`}>
                  {banner.title}
                </p>
                <p className="text-[#7A6670] text-sm mt-1 leading-relaxed">
                  {banner.message}
                </p>
                {user.verificationStatus === "PENDING" && (
                  <div className="flex gap-3 mt-4">
                    <Link
                      href="/dashboard/settings"
                      className="btn-ghost text-xs py-2 px-4"
                    >
                      Settings
                    </Link>
                    <Link
                      href="/dashboard/billing"
                      className="btn-rose text-xs py-2 px-4"
                    >
                      View plans
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* Stats */}
        {isVerified && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
            <StatCard
              label="Today's queue"
              value={queueCount}
              note="unseen introductions"
            />
            <StatCard
              label="Active matches"
              value={activeMatchCount}
              note="mutual connections"
            />
            <StatCard
              label="Membership"
              value={
                user.membershipTier
                  ? user.membershipTier.charAt(0) +
                    user.membershipTier.slice(1).toLowerCase()
                  : "—"
              }
              note={user.membershipTier ? "current plan" : "no subscription"}
              rose={!!user.membershipTier}
            />
          </div>
        )}

        {/* Quick actions */}
        {isVerified && (
          <>
            <h2 className="font-[family-name:var(--font-heading)] font-semibold text-[#B0A0A8] text-xs tracking-widest uppercase mb-3">
              Quick actions
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              <ActionCard
                href="/browse"
                icon={Compass}
                title="Browse"
                description={
                  queueCount > 0
                    ? `${queueCount} introduction${queueCount !== 1 ? "s" : ""} waiting`
                    : "Check back tomorrow"
                }
                dimmed={queueCount === 0}
              />
              <ActionCard
                href="/matches"
                icon={Heart}
                title="Matches"
                description={
                  activeMatchCount > 0
                    ? `${activeMatchCount} active connection${activeMatchCount !== 1 ? "s" : ""}`
                    : "No matches yet"
                }
              />
              <ActionCard
                href="/messages"
                icon={MessageSquare}
                title="Messages"
                description="Chat with your matches"
              />
            </div>
          </>
        )}

        {/* Billing CTA */}
        {isVerified && !user.membershipTier && (
          <div className="mt-8 p-6 rounded-xl border border-[#A8476A]/20 bg-[#A8476A]/[0.04]">
            <p className="font-[family-name:var(--font-heading)] font-semibold text-[#1C1218] mb-1.5">
              Activate your membership
            </p>
            <p className="text-[#7A6670] text-sm mb-4">
              Choose a plan to start receiving curated introductions every day.
            </p>
            <Link href="/dashboard/billing" className="btn-rose py-2.5 px-5 text-sm">
              View plans <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
