"use client"

import { motion } from "framer-motion"

const TESTIMONIALS = [
  {
    quote:
      "I'd given up on dating apps entirely. eclat felt like the first one built for adults — no swiping, no games, no ghosts. Met someone incredible in my second week.",
    name: "Priya S.",
    role: "Investment Banker · Mumbai",
    initials: "PS",
  },
  {
    quote:
      "The verification process sets a completely different tone. You know every person you're talking to is exactly who they say they are. That changes everything.",
    name: "Arjun M.",
    role: "Founder · Dubai",
    initials: "AM",
  },
  {
    quote:
      "I travel between London and Bangalore every month. The curated queue actually reflects that — I'm not just being shown people in one city. It's thoughtful.",
    name: "Kavya R.",
    role: "Partner, McKinsey · London",
    initials: "KR",
  },
]

export default function Testimonials() {
  return (
    <section
      className="section relative bg-[#080808] overflow-hidden"
      aria-label="Testimonials"
    >
      {/* Subtle gold radial behind the section */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(201,168,76,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="container relative">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-16 md:mb-20"
        >
          <span className="block divider-gold mb-6" aria-hidden="true" />
          <h2
            className="font-[family-name:var(--font-heading)] font-bold text-[#F5F0E8] leading-[1.05] tracking-[-0.03em]"
            style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)" }}
          >
            What members say.
          </h2>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.65, ease: "easeOut", delay: i * 0.13 }}
              className="relative flex flex-col gap-8 p-8 md:p-10 rounded-xl border border-white/[0.07] bg-[#0D0D0D] hover:border-[rgba(201,168,76,0.15)] transition-colors duration-300"
            >
              {/* Large opening quote mark */}
              <span
                className="absolute top-6 left-8 font-[family-name:var(--font-heading)] font-bold text-[5rem] leading-none text-[#C9A84C] opacity-[0.08] select-none pointer-events-none"
                aria-hidden="true"
              >
                &ldquo;
              </span>

              {/* Quote text */}
              <blockquote
                className="relative text-[#AAAAAA] leading-relaxed"
                style={{ fontSize: "clamp(0.95rem, 1.5vw, 1.05rem)" }}
              >
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3 mt-auto pt-6 border-t border-white/[0.06]">
                {/* Avatar initials */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[0.65rem] font-bold tracking-wide text-[#C9A84C]"
                  style={{
                    background: "rgba(201,168,76,0.08)",
                    border: "1px solid rgba(201,168,76,0.18)",
                  }}
                  aria-hidden="true"
                >
                  {t.initials}
                </div>
                <div>
                  <p className="text-[#F5F0E8] text-sm font-medium">{t.name}</p>
                  <p className="text-[#555555] text-xs tracking-wide">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footnote */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-10 text-center text-[#444444] text-xs tracking-wide"
        >
          Names and identifying details changed to protect member privacy.
        </motion.p>

      </div>
    </section>
  )
}
