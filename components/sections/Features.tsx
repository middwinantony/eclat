"use client"

import { motion, type Variants } from "framer-motion"
import { ShieldCheck, Layers, Lock } from "lucide-react"

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Human-Verified Profiles",
    body: "Every applicant is reviewed by our curation team before receiving access. We check identity, profession, and intent — no bots, no catfishing, no exceptions.",
    detail: "Government ID · LinkedIn · Video liveness check",
  },
  {
    icon: Layers,
    title: "Curated Daily Queue",
    body: "Forget endless swiping. Each morning, you receive a small, hand-curated selection of compatible matches based on depth — not just distance and age.",
    detail: "Up to 15 introductions per day on Reserve & Noir",
  },
  {
    icon: Lock,
    title: "End-to-End Privacy",
    body: "Messages are encrypted at rest. Photos are blurred until both sides express interest. Your data is never sold, profiled for ads, or shared with third parties.",
    detail: "AES-256 encryption · No ad profiling · GDPR compliant",
  },
]

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 32 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.65, ease: "easeOut" } },
}

export default function Features() {
  return (
    <section id="features" className="section bg-[#F3EDE7]" aria-label="Features">
      <div className="container">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-16 md:mb-20"
        >
          {/* Ornament */}
          <div className="ornament" aria-hidden="true">
            <span className="ornament-dot">✦</span>
          </div>

          <h2
            className="font-[family-name:var(--font-heading)] font-bold text-[#1C1218] leading-[1.05] tracking-[-0.03em] mb-4"
            style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)" }}
          >
            Built for people who value{" "}
            <em
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontWeight: 500,
                color: "#A8476A",
                fontSize: "1.05em",
              }}
            >
              their time.
            </em>
          </h2>
          <p className="text-[#B0A0A8] text-sm tracking-wide">
            Three principles that set eclat apart from every other platform.
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <motion.div
                key={f.title}
                variants={cardVariants}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.15 }}
                className="card group p-10 md:p-11 flex flex-col gap-5"
              >
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-[#A8476A] transition-all duration-300 group-hover:scale-110"
                  style={{
                    border: "1px solid rgba(168,71,106,0.22)",
                    background: "rgba(168,71,106,0.07)",
                  }}
                >
                  <Icon size={18} strokeWidth={1.5} />
                </div>

                {/* Title */}
                <h3
                  className="font-[family-name:var(--font-heading)] font-bold text-[#1C1218] leading-[1.15] tracking-[-0.02em]"
                  style={{ fontSize: "clamp(1.2rem, 2.2vw, 1.5rem)" }}
                >
                  {f.title}
                </h3>

                {/* Body */}
                <p className="text-[#7A6670] text-sm leading-relaxed flex-1">
                  {f.body}
                </p>

                {/* Detail */}
                <div className="pt-4 border-t border-black/[0.06]">
                  <span className="text-[#A8476A] text-[0.68rem] tracking-widest uppercase opacity-80">
                    {f.detail}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
