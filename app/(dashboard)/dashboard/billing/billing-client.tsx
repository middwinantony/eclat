"use client"

import { useState } from "react"
import { Check, ExternalLink, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

type Tier   = "SELECT" | "RESERVE" | "NOIR"
type Status = "ACTIVE" | "PAST_DUE" | "CANCELLED" | "TRIALING" | "INCOMPLETE"

interface Subscription {
  tier:              Tier
  status:            Status
  currentPeriodEnd:  Date | null
  cancelAtPeriodEnd: boolean
  stripeCustomerId:  string | null
}

interface Props {
  subscription:  Subscription | null
  stripeEnabled: boolean
}

const TIERS: Array<{
  id:           Tier
  name:         string
  monthlyPrice: number
  description:  string
  features:     string[]
  featured:     boolean
}> = [
  {
    id:           "SELECT",
    name:         "Select",
    monthlyPrice: 4999,
    description:  "For those taking their first step into intentional dating.",
    features: [
      "Up to 3 introductions per day",
      "Human-verified profile badge",
      "Text messaging",
      "Profile visible to Reserve & Noir members",
      "Priority support",
    ],
    featured: false,
  },
  {
    id:           "RESERVE",
    name:         "Reserve",
    monthlyPrice: 12999,
    description:  "For professionals who take relationships as seriously as their careers.",
    features: [
      "Up to 15 introductions per day",
      "Everything in Select",
      "Encrypted video calls",
      "Read receipts",
      "Advanced preference filters",
      "Concierge onboarding call",
    ],
    featured: true,
  },
  {
    id:           "NOIR",
    name:         "Noir",
    monthlyPrice: 24999,
    description:  "An entirely private, white-glove experience.",
    features: [
      "Unlimited introductions",
      "Everything in Reserve",
      "Dedicated relationship manager",
      "Offline event invitations",
      "Profile hidden from search — introductions only",
      "Early access to new features",
    ],
    featured: false,
  },
]

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n)
}

function formatDate(d: Date | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
}

const STATUS_LABELS: Record<Status, { label: string; color: string }> = {
  ACTIVE:     { label: "Active",     color: "text-emerald-600" },
  TRIALING:   { label: "Trial",      color: "text-blue-600"    },
  PAST_DUE:   { label: "Past due",   color: "text-amber-600"   },
  INCOMPLETE: { label: "Incomplete", color: "text-amber-600"   },
  CANCELLED:  { label: "Cancelled",  color: "text-red-500"     },
}

export function BillingClient({ subscription, stripeEnabled }: Props) {
  const [loadingTier,   setLoadingTier]   = useState<Tier | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  const activeTier = subscription?.status === "ACTIVE" || subscription?.status === "TRIALING"
    ? subscription.tier
    : null

  async function subscribe(tier: Tier) {
    setLoadingTier(tier)
    setError(null)
    try {
      const res = await fetch("/api/billing/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tier }),
      })
      const json = await res.json() as { url?: string; error?: string }
      if (!res.ok || !json.url) {
        setError(json.error ?? "Could not start checkout.")
        return
      }
      window.location.href = json.url
    } catch {
      setError("Network error — please try again.")
    } finally {
      setLoadingTier(null)
    }
  }

  async function openPortal() {
    setPortalLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" })
      const json = await res.json() as { url?: string; error?: string }
      if (!res.ok || !json.url) {
        setError(json.error ?? "Could not open billing portal.")
        return
      }
      window.location.href = json.url
    } catch {
      setError("Network error — please try again.")
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Current subscription summary */}
      {subscription ? (
        <div className="card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-medium text-[#B0A0A8] uppercase tracking-wide mb-1">Current plan</p>
              <p className="font-[family-name:var(--font-heading)] font-bold text-[#1C1218] text-xl tracking-tight">
                {subscription.tier.charAt(0) + subscription.tier.slice(1).toLowerCase()}
                <span className={cn("ml-2.5 text-sm font-normal", STATUS_LABELS[subscription.status].color)}>
                  {STATUS_LABELS[subscription.status].label}
                </span>
              </p>
              {subscription.currentPeriodEnd && (
                <p className="text-xs text-[#B0A0A8] mt-1.5">
                  {subscription.cancelAtPeriodEnd
                    ? `Cancels on ${formatDate(subscription.currentPeriodEnd)}`
                    : `Renews ${formatDate(subscription.currentPeriodEnd)}`}
                </p>
              )}
              {subscription.status === "PAST_DUE" && (
                <div className="flex items-center gap-2 mt-2 text-amber-600 text-xs">
                  <AlertTriangle size={13} />
                  Payment overdue — please update your payment method.
                </div>
              )}
            </div>

            {subscription.stripeCustomerId && (
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="btn-ghost py-2.5 px-4 text-sm flex items-center gap-2 flex-shrink-0 disabled:opacity-50"
              >
                <ExternalLink size={14} />
                {portalLoading ? "Opening…" : "Manage subscription"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[#A8476A]/20 bg-[#A8476A]/[0.04] p-5">
          <p className="text-[#1C1218] text-sm font-medium">No active subscription</p>
          <p className="text-[#7A6670] text-xs mt-1">Choose a plan below to get started.</p>
        </div>
      )}

      {!stripeEnabled && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          Payment processing is not configured yet. Tier selection is shown for preview.
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500/80">{error}</p>
      )}

      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TIERS.map((tier) => {
          const isCurrent  = activeTier === tier.id
          const isLoading  = loadingTier === tier.id

          return (
            <div
              key={tier.id}
              className={cn(
                "relative flex flex-col rounded-[1.25rem] p-7 bg-white",
                tier.featured ? "card-featured" : "card"
              )}
            >
              {tier.featured && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-[0.65rem] font-bold tracking-[0.15em] uppercase text-white px-4 py-1 rounded-full whitespace-nowrap"
                  style={{
                    background: "linear-gradient(135deg, #A8476A, #C4688A)",
                    boxShadow: "0 2px 14px rgba(168,71,106,0.35)",
                  }}
                >
                  Most Popular
                </span>
              )}

              <p className="text-[#A8476A] text-[0.65rem] tracking-[0.2em] uppercase font-semibold mb-2">
                {tier.name}
              </p>

              <div className="flex items-end gap-1 mb-1">
                <span
                  className="font-[family-name:var(--font-heading)] font-bold text-[#1C1218] tracking-tight leading-none"
                  style={{ fontSize: "clamp(1.6rem, 3vw, 2rem)" }}
                >
                  {formatINR(tier.monthlyPrice)}
                </span>
                <span className="text-[#B0A0A8] text-xs mb-0.5">/mo</span>
              </div>

              <p className="text-[#7A6670] text-xs leading-relaxed mb-6 mt-2">
                {tier.description}
              </p>

              {isCurrent ? (
                <div className="mb-6 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-[#A8476A]/20 bg-[#A8476A]/[0.06] text-[#A8476A] text-xs font-semibold tracking-wide">
                  <Check size={13} strokeWidth={2.5} />
                  Current plan
                </div>
              ) : (
                <button
                  onClick={() => stripeEnabled && subscribe(tier.id)}
                  disabled={isLoading || !stripeEnabled}
                  className={cn(
                    "mb-6 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none",
                    tier.featured ? "btn-rose" : "btn-ghost"
                  )}
                >
                  {isLoading ? "Loading…" : stripeEnabled ? `Choose ${tier.name}` : `${tier.name} — coming soon`}
                </button>
              )}

              <div className="border-t border-black/[0.06] mb-5" />

              <ul className="flex flex-col gap-2.5 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check size={12} className="text-[#A8476A] mt-0.5 shrink-0 opacity-80" strokeWidth={2.5} />
                    <span className="text-[#7A6670] text-xs leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <p className="text-center text-[#B0A0A8] text-xs">
        Prices in Indian Rupees. NRI members may pay in USD, AED, or GBP at checkout.
        All plans auto-renew and can be cancelled anytime.
      </p>
    </div>
  )
}
