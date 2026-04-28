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
    <section id="how-it-works" className="section bg-[#FAF7F4]" aria-label="How it works">
      <div className="container">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-20 md:mb-24"
        >
          {/* Ornament */}
          <div className="ornament" aria-hidden="true">
            <span className="ornament-dot">✦</span>
          </div>

          <h2
            className="font-[family-name:var(--font-heading)] font-bold text-[#1C1218] leading-[1.05] tracking-[-0.03em]"
            style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)" }}
          >
            Three steps to your{" "}
            <em
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontWeight: 500,
                color: "#A8476A",
                fontSize: "1.05em",
              }}
            >
              first introduction.
            </em>
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
              className="relative grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-16 py-14 md:py-16 border-b border-black/[0.07] last:border-b-0"
            >
              {/* Ghost number — right-aligned, barely visible */}
              <span
                className="absolute right-0 top-1/2 -translate-y-1/2 font-[family-name:var(--font-heading)] font-bold leading-none select-none pointer-events-none"
                style={{
                  fontSize: "clamp(6rem, 14vw, 11rem)",
                  color: "rgba(168,71,106,0.06)",
                }}
                aria-hidden="true"
              >
                {step.number}
              </span>

              {/* Left col — step label */}
              <div className="relative flex items-start gap-4 pt-1">
                {/* Rose dot + connector */}
                <div className="flex flex-col items-center shrink-0 mt-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-[#A8476A]"
                    style={{ boxShadow: "0 0 10px rgba(168,71,106,0.4)" }}
                  />
                  {i < STEPS.length - 1 && (
                    <div
                      className="w-px flex-1 mt-2.5 hidden md:block"
                      style={{
                        minHeight: "4rem",
                        background: "linear-gradient(to bottom, rgba(168,71,106,0.35), transparent)",
                      }}
                    />
                  )}
                </div>

                <div>
                  <span className="text-[#A8476A] text-[0.65rem] tracking-[0.2em] uppercase font-semibold">
                    Step {step.number}
                  </span>
                  <h3
                    className="font-[family-name:var(--font-heading)] font-bold text-[#1C1218] tracking-[-0.025em] leading-none mt-1"
                    style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}
                  >
                    {step.title}
                  </h3>
                </div>
              </div>

              {/* Right col — body */}
              <div className="relative flex items-center">
                <p className="text-[#7A6670] text-base md:text-lg leading-relaxed max-w-lg">
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
