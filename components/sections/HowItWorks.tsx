"use client"

import { motion } from "framer-motion"

const STEPS = [
  {
    number: "1",
    title: "Apply",
    body: "Submit your application with a LinkedIn profile and a brief note on what you're looking for. Our team reviews every submission — typically within 48 hours.",
  },
  {
    number: "2",
    title: "Get Verified",
    body: "Complete a 60-second liveness check and government ID verification. Once cleared, you choose your membership tier and activate your profile.",
  },
  {
    number: "3",
    title: "Connect",
    body: "Each morning, receive your curated queue. Express interest, exchange messages, and move at your own pace — no pressure, no gamification.",
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section bg-[#080808]" aria-label="How it works">
      <div className="container">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-20 md:mb-24"
        >
          <span className="block divider-gold mb-6" aria-hidden="true" />
          <h2
            className="font-[family-name:var(--font-heading)] font-bold text-[#F5F0E8] leading-[1.05] tracking-[-0.03em] mb-4"
            style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)" }}
          >
            Three steps to your
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #C9A84C 0%, #E8C96A 50%, #C9A84C 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              first introduction.
            </span>
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="flex flex-col gap-0">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.65, ease: "easeOut", delay: i * 0.12 }}
              className="relative grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 md:gap-16 py-12 md:py-16 border-b border-white/[0.06] last:border-b-0 group"
            >
              {/* Large background number */}
              <span
                className="absolute -top-4 left-0 font-[family-name:var(--font-heading)] font-bold leading-none text-white/[0.025] select-none pointer-events-none"
                style={{ fontSize: "clamp(7rem, 18vw, 14rem)" }}
                aria-hidden="true"
              >
                {step.number}
              </span>

              {/* Left col — step label */}
              <div className="relative flex items-start gap-4 pt-1">
                {/* Gold dot + connector */}
                <div className="flex flex-col items-center shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-[#C9A84C] opacity-80" />
                  {i < STEPS.length - 1 && (
                    <div className="w-px flex-1 bg-gradient-to-b from-[rgba(201,168,76,0.3)] to-transparent mt-2 hidden md:block" style={{ minHeight: "4rem" }} />
                  )}
                </div>

                <div>
                  <span className="text-[#C9A84C] text-[0.65rem] tracking-[0.2em] uppercase font-medium">
                    Step {step.number}
                  </span>
                  <h3
                    className="font-[family-name:var(--font-heading)] font-bold text-[#F5F0E8] tracking-[-0.025em] leading-none mt-1"
                    style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}
                  >
                    {step.title}
                  </h3>
                </div>
              </div>

              {/* Right col — body */}
              <div className="relative flex items-center">
                <p className="text-[#666666] text-base md:text-lg leading-relaxed max-w-lg">
                  {step.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
