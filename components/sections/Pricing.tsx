"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const ANNUAL_DISCOUNT = 0.8 // 20% off annual

const TIERS = [
  {
    id: "select",
    name: "Select",
    monthlyPrice: 4999,
    description: "For those taking their first step into intentional dating.",
    features: [
      "Up to 3 introductions per day",
      "Human-verified profile badge",
      "Text messaging",
      "Profile visible to Reserve & Noir members",
      "Priority support",
    ],
    cta: "Apply for Select",
    featured: false,
  },
  {
    id: "reserve",
    name: "Reserve",
    monthlyPrice: 12999,
    description: "For professionals who take relationships as seriously as their careers.",
    features: [
      "Up to 15 introductions per day",
      "Everything in Select",
      "Encrypted video calls",
      "Read receipts",
      "Advanced preference filters",
      "Concierge onboarding call",
    ],
    cta: "Apply for Reserve",
    featured: true,
  },
  {
    id: "noir",
    name: "Noir",
    monthlyPrice: 24999,
    description: "An entirely private, white-glove experience.",
    features: [
      "Unlimited introductions",
      "Everything in Reserve",
      "Dedicated relationship manager",
      "Offline event invitations",
      "Profile hidden from search — introductions only",
      "Early access to new features",
    ],
    cta: "Apply for Noir",
    featured: false,
  },
] as const

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function Pricing() {
  const [annual, setAnnual] = useState(false)

  return (
    <section id="pricing" className="section bg-[#080808]" aria-label="Pricing">
      <div className="container">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-14 md:mb-16"
        >
          <span className="block divider-gold mb-6" aria-hidden="true" />
          <h2
            className="font-[family-name:var(--font-heading)] font-bold text-[#F5F0E8] leading-[1.05] tracking-[-0.03em] mb-4"
            style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)" }}
          >
            Membership tiers.
          </h2>
          <p className="text-[#555555] text-sm tracking-wide">
            All tiers require an approved application.
          </p>
        </motion.div>

        {/* Toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-start gap-4 mb-12"
        >
          <button
            onClick={() => setAnnual(false)}
            className={cn(
              "text-sm font-medium transition-colors duration-200",
              !annual ? "text-[#F5F0E8]" : "text-[#555555] hover:text-[#888888]"
            )}
          >
            Monthly
          </button>
          {/* Toggle pill */}
          <button
            role="switch"
            aria-checked={annual}
            onClick={() => setAnnual((a) => !a)}
            className={cn(
              "relative w-11 h-6 rounded-full border transition-colors duration-300",
              annual
                ? "bg-[rgba(201,168,76,0.15)] border-[rgba(201,168,76,0.35)]"
                : "bg-white/[0.06] border-white/[0.12]"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-300",
                annual ? "translate-x-5 bg-[#C9A84C]" : "translate-x-0 bg-[#555555]"
              )}
            />
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={cn(
              "flex items-center gap-2 text-sm font-medium transition-colors duration-200",
              annual ? "text-[#F5F0E8]" : "text-[#555555] hover:text-[#888888]"
            )}
          >
            Annual
            <span className="text-[0.65rem] font-semibold tracking-wide text-[#C9A84C] border border-[rgba(201,168,76,0.3)] bg-[rgba(201,168,76,0.07)] px-1.5 py-0.5 rounded">
              SAVE 20%
            </span>
          </button>
        </motion.div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier, i) => {
            const monthly = annual
              ? Math.round(tier.monthlyPrice * ANNUAL_DISCOUNT)
              : tier.monthlyPrice

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.65, ease: "easeOut", delay: i * 0.12 }}
                className={cn(
                  "relative flex flex-col rounded-xl p-8 md:p-9",
                  tier.featured
                    ? "bg-[#111111] border border-[rgba(201,168,76,0.3)]"
                    : "bg-[#0D0D0D] border border-white/[0.07]"
                )}
              >
                {/* Popular badge */}
                {tier.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-[#080808] bg-[#C9A84C] px-3 py-1 rounded-full whitespace-nowrap">
                    Most Popular
                  </span>
                )}

                {/* Tier name */}
                <p className="text-[#C9A84C] text-xs tracking-[0.2em] uppercase font-medium mb-3">
                  {tier.name}
                </p>

                {/* Price */}
                <div className="mb-2 flex items-end gap-1">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={`${tier.id}-${annual}`}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2 }}
                      className="font-[family-name:var(--font-heading)] font-bold text-[#F5F0E8] tracking-[-0.03em] leading-none"
                      style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)" }}
                    >
                      {formatINR(monthly)}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-[#555555] text-sm mb-1">/mo</span>
                </div>

                {annual && (
                  <p className="text-[#555555] text-xs mb-1">
                    Billed as {formatINR(monthly * 12)}/year
                  </p>
                )}

                <p className="text-[#666666] text-sm leading-relaxed mb-8 mt-2">
                  {tier.description}
                </p>

                {/* CTA */}
                <Link
                  href="/signup"
                  className={cn(
                    "mb-8 text-[0.85rem] py-3 px-6 text-center rounded-lg font-semibold transition-all duration-200",
                    tier.featured
                      ? "btn-gold"
                      : "btn-ghost"
                  )}
                >
                  {tier.cta}
                </Link>

                {/* Divider */}
                <div className="border-t border-white/[0.06] mb-7" />

                {/* Features list */}
                <ul className="flex flex-col gap-3 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <Check
                        size={13}
                        className="text-[#C9A84C] mt-0.5 shrink-0 opacity-80"
                        strokeWidth={2.5}
                      />
                      <span className="text-[#888888] text-sm leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )
          })}
        </div>

        {/* Footnote */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-10 text-center text-[#444444] text-xs tracking-wide"
        >
          Prices in Indian Rupees. NRI members may pay in USD, AED, or GBP at checkout.
          All plans auto-renew and can be cancelled anytime.
        </motion.p>

      </div>
    </section>
  )
}
