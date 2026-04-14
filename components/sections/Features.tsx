"use client"

import { motion, type Variants } from "framer-motion"
import { ShieldCheck, Layers, Lock } from "lucide-react"

const FEATURES = [
  {
    icon: ShieldCheck,
    number: "01",
    title: "Human-Verified\nProfiles",
    body:
      "Every applicant is reviewed by our curation team before receiving access. We check identity, profession, and intent — no bots, no catfishing, no exceptions.",
    detail: "Government ID · LinkedIn · Video liveness check",
  },
  {
    icon: Layers,
    number: "02",
    title: "Curated Daily\nQueue",
    body:
      "Forget endless swiping. Each morning, you receive a small, hand-curated selection of compatible matches based on depth — not just distance and age.",
    detail: "Up to 15 introductions per day on Reserve & Noir",
  },
  {
    icon: Lock,
    number: "03",
    title: "End-to-End\nPrivacy",
    body:
      "Messages are encrypted at rest. Photos are blurred until both sides express interest. Your data is never sold, profiled for ads, or shared with third parties.",
    detail: "AES-256 encryption · No ad profiling · GDPR compliant",
  },
]

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 32 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.65, ease: "easeOut" } },
}

export default function Features() {
  return (
    <section id="features" className="section bg-[#080808]" aria-label="Features">
      <div className="container">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-16 md:mb-20"
        >
          <span className="block divider-gold mb-6" aria-hidden="true" />
          <h2
            className="font-[family-name:var(--font-heading)] font-bold text-[#F5F0E8] leading-[1.05] tracking-[-0.03em] mb-4"
            style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)" }}
          >
            Built for people who value
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #C9A84C 0%, #E8C96A 50%, #C9A84C 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              their time.
            </span>
          </h2>
          <p className="text-[#555555] text-sm tracking-wide max-w-sm">
            Three principles that set eclat apart from every other platform.
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.06] rounded-xl overflow-hidden">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <motion.div
                key={f.number}
                variants={cardVariants}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.15 }}
                className="relative bg-[#0D0D0D] p-8 md:p-10 flex flex-col gap-6 group hover:bg-[#111111] transition-colors duration-300"
              >
                {/* Large background number */}
                <span
                  className="absolute top-6 right-8 font-[family-name:var(--font-heading)] font-bold text-[5rem] leading-none text-white/[0.03] select-none pointer-events-none"
                  aria-hidden="true"
                >
                  {f.number}
                </span>

                {/* Icon */}
                <div className="w-10 h-10 rounded-lg border border-[rgba(201,168,76,0.2)] bg-[rgba(201,168,76,0.06)] flex items-center justify-center text-[#C9A84C]">
                  <Icon size={18} strokeWidth={1.5} />
                </div>

                {/* Title */}
                <h3
                  className="font-[family-name:var(--font-heading)] font-bold text-[#F5F0E8] leading-[1.1] tracking-[-0.02em] whitespace-pre-line"
                  style={{ fontSize: "clamp(1.35rem, 2.5vw, 1.65rem)" }}
                >
                  {f.title}
                </h3>

                {/* Body */}
                <p className="text-[#666666] text-sm leading-relaxed flex-1">
                  {f.body}
                </p>

                {/* Detail pill */}
                <div className="mt-auto pt-4 border-t border-white/[0.06]">
                  <span className="text-[#C9A84C] text-[0.7rem] tracking-widest uppercase opacity-70">
                    {f.detail}
                  </span>
                </div>

                {/* Left accent line — slides in on hover */}
                <div
                  className="absolute left-0 top-8 bottom-8 w-px bg-[#C9A84C] opacity-0 group-hover:opacity-30 transition-opacity duration-300"
                  aria-hidden="true"
                />
              </motion.div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
