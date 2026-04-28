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
      className="section relative bg-[#F3EDE7] overflow-hidden"
      aria-label="Testimonials"
    >
      {/* Soft rose radial */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(168,71,106,0.05) 0%, transparent 70%)",
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
          <div className="ornament" aria-hidden="true">
            <span className="ornament-dot">✦</span>
          </div>
          <h2
            className="font-[family-name:var(--font-heading)] font-bold text-[#1C1218] leading-[1.05] tracking-[-0.03em]"
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
              className="card relative flex flex-col gap-8 p-8 md:p-10"
            >
              {/* Large opening quote mark */}
              <span
                className="absolute top-6 left-8 font-[family-name:var(--font-serif)] font-bold text-[5rem] leading-none text-[#A8476A] opacity-[0.10] select-none pointer-events-none"
                aria-hidden="true"
                style={{ fontStyle: "italic" }}
              >
                &ldquo;
              </span>

              {/* Quote text */}
              <blockquote
                className="relative text-[#7A6670] leading-relaxed"
                style={{ fontSize: "clamp(0.95rem, 1.5vw, 1.05rem)" }}
              >
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3 mt-auto pt-6 border-t border-black/[0.06]">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[0.65rem] font-bold tracking-wide text-[#A8476A]"
                  style={{
                    background: "rgba(168,71,106,0.08)",
                    border: "1px solid rgba(168,71,106,0.18)",
                  }}
                  aria-hidden="true"
                >
                  {t.initials}
                </div>
                <div>
                  <p className="text-[#1C1218] text-sm font-medium">{t.name}</p>
                  <p className="text-[#B0A0A8] text-xs tracking-wide">{t.role}</p>
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
          className="mt-10 text-center text-[#B0A0A8] text-xs tracking-wide"
        >
          Names and identifying details changed to protect member privacy.
        </motion.p>

      </div>
    </section>
  )
}
