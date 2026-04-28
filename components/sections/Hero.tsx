"use client"

import Link from "next/link"
import { motion, type Variants } from "framer-motion"
import { ArrowRight } from "lucide-react"

// ── Animation variants ─────────────────────────────────────────────────────
const container: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
}

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.8, ease: "easeOut" } },
}

export default function Hero() {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      aria-label="Hero"
    >
      {/* ── Background layers ────────────────────────────────────────── */}

      {/* Base */}
      <div className="absolute inset-0 bg-[#FAF7F4]" aria-hidden="true" />

      {/* Soft rose bloom — centre-bottom */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 90%, rgba(168,71,106,0.10) 0%, rgba(196,120,138,0.04) 45%, transparent 70%)",
        }}
      />

      {/* Upper-right corner bloom */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 45% at 88% 8%, rgba(168,71,106,0.07) 0%, transparent 55%)",
        }}
      />

      {/* Drifting orb */}
      <div
        className="absolute pointer-events-none rounded-full"
        aria-hidden="true"
        style={{
          width: 600,
          height: 600,
          top: "0%",
          left: "52%",
          background: "radial-gradient(circle, rgba(168,71,106,0.06) 0%, transparent 70%)",
          animation: "drift 22s infinite ease-in-out",
        }}
      />

      {/* Top line */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        aria-hidden="true"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(168,71,106,0.5), transparent)",
        }}
      />

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="container relative z-10 flex flex-col items-center text-center pt-36 pb-24">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center"
        >

          {/* Badge */}
          <motion.div variants={fadeUp} className="mb-11">
            <span
              className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full text-[#A8476A] text-[0.68rem] font-semibold tracking-[0.14em] uppercase"
              style={{
                border: "1px solid rgba(168,71,106,0.22)",
                background: "rgba(168,71,106,0.07)",
              }}
            >
              <span className="text-[0.5rem]">✦</span>
              Human-Verified Members Only
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            variants={fadeUp}
            className="font-[family-name:var(--font-heading)] font-extrabold text-[#1C1218] tracking-[-0.03em] mb-[4.5rem]"
            style={{
              fontSize: "clamp(3.75rem, 10vw, 7.5rem)",
              lineHeight: 1.05,
            }}
          >
            India&rsquo;s most
            <br />
            <em
              className="not-italic"
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontWeight: 500,
                fontSize: "1em",
                color: "#A8476A",
                letterSpacing: "-0.02em",
              }}
            >
              exclusive circle.
            </em>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            variants={fadeUp}
            className="max-w-[440px] text-[#7A6670] text-lg md:text-xl leading-relaxed mb-3"
          >
            Every profile human-verified. Every connection curated.
            Every experience, luxury.
          </motion.p>

          {/* Restraint line */}
          <motion.p
            variants={fadeUp}
            className="text-[#B0A0A8] text-sm tracking-[0.08em] font-medium mb-14"
          >
            Not for everyone. Intentionally.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Link href="/signup" className="btn-rose text-[0.9rem] py-3.5 px-7 flex items-center gap-2">
              Apply for Membership
              <ArrowRight size={15} />
            </Link>
            <Link href="#how-it-works" className="btn-ghost text-[0.9rem] py-3.5 px-7">
              How it works
            </Link>
          </motion.div>

          {/* Trust bar */}
          <motion.div
            variants={fadeIn}
            className="mt-20 flex flex-col sm:flex-row items-center gap-6 sm:gap-12 text-[#B0A0A8] text-xs tracking-wide"
          >
            {[
              "No algorithm. Only curation.",
              "Identity verified before access",
              "India · Dubai · London · New York",
            ].map((item, i) => (
              <span key={i} className="flex items-center gap-2">
                <span
                  className="w-1 h-1 rounded-full bg-[#A8476A] opacity-70"
                  aria-hidden="true"
                />
                {item}
              </span>
            ))}
          </motion.div>

        </motion.div>
      </div>

      {/* ── Scroll indicator ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        aria-hidden="true"
      >
        <span className="text-[#B0A0A8] text-[10px] tracking-[0.2em] uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-6 bg-gradient-to-b from-[#B0A0A8] to-transparent"
        />
      </motion.div>

      {/* ── Bottom fade ──────────────────────────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        aria-hidden="true"
        style={{ background: "linear-gradient(to bottom, transparent, #FAF7F4)" }}
      />
    </section>
  )
}
