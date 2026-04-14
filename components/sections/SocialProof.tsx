"use client"

import { motion } from "framer-motion"
import { ShieldCheck, Star, Users } from "lucide-react"

const STATS = [
  {
    icon: <Users size={14} />,
    value: "2,400+",
    label: "Verified Members",
  },
  {
    icon: <Star size={14} />,
    value: "4.9",
    label: "Average Rating",
  },
  {
    icon: <ShieldCheck size={14} />,
    value: "100%",
    label: "Human-Verified Profiles",
  },
]

export default function SocialProof() {
  return (
    <section aria-label="Social proof" className="relative bg-[#080808]">
      {/* Top rule */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(201,168,76,0.15), transparent)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="container"
      >
        <div className="py-12 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-0">
          {STATS.map((stat, i) => (
            <div key={stat.label} className="flex items-center">
              {/* Stat */}
              <div className="flex flex-col sm:flex-row items-center gap-3 px-0 sm:px-12">
                {/* Icon + value */}
                <div className="flex items-center gap-2">
                  <span className="text-[#C9A84C] opacity-70">{stat.icon}</span>
                  <span
                    className="font-[family-name:var(--font-heading)] font-bold text-[#F5F0E8] text-2xl tracking-[-0.03em]"
                  >
                    {stat.value}
                  </span>
                </div>
                <span className="text-[#555555] text-xs tracking-wide uppercase text-center sm:text-left">
                  {stat.label}
                </span>
              </div>

              {/* Divider — hidden after last item */}
              {i < STATS.length - 1 && (
                <div
                  className="hidden sm:block w-px h-8 bg-white/[0.07]"
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Bottom rule */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)",
        }}
      />
    </section>
  )
}
