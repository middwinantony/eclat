"use client"

import Link from "next/link"
import { motion, type Variants } from "framer-motion"
import { ArrowRight, ShieldCheck } from "lucide-react"

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
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden grain-overlay"
      aria-label="Hero"
    >
      {/* ── Cinematic background layers ─────────────────────────────────── */}

      {/* Base: near-black */}
      <div className="absolute inset-0 bg-[#080808]" aria-hidden="true" />

      {/* Radial gold glow — centre-bottom, very subtle */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(201,168,76,0.09) 0%, transparent 70%)",
        }}
      />

      {/* Second glow — upper-right, adds depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 80% 10%, rgba(201,168,76,0.05) 0%, transparent 60%)",
        }}
      />

      {/* Horizontal line — architectural detail */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        aria-hidden="true"
        style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)" }}
      />

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="container relative z-10 flex flex-col items-center text-center pt-28 pb-20">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center"
        >

          {/* Pre-headline badge */}
          <motion.div variants={fadeUp} className="mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[rgba(201,168,76,0.25)] bg-[rgba(201,168,76,0.06)] text-[#C9A84C] text-xs font-medium tracking-widest uppercase">
              <ShieldCheck size={12} />
              Human-Verified Members Only
            </span>
          </motion.div>

          {/* Main headline — Bricolage Grotesque 800, 64px → 96px → 112px */}
          <motion.h1
            variants={fadeUp}
            className="font-[family-name:var(--font-heading)] font-extrabold text-[#F5F0E8] leading-[0.95] tracking-[-0.03em] mb-6"
            style={{
              fontSize: "clamp(3.5rem, 10vw, 7rem)",
            }}
          >
            India&rsquo;s most
            <br />
            <span
              className="relative inline-block"
              style={{
                WebkitTextStroke: "0px transparent",
                background: "linear-gradient(135deg, #C9A84C 0%, #E8C96A 50%, #C9A84C 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              exclusive circle.
            </span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            variants={fadeUp}
            className="max-w-xl text-[#888888] text-lg md:text-xl leading-relaxed mb-3"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Every profile human-verified. Every connection curated.
            <br className="hidden sm:block" />
            Every experience, luxury.
          </motion.p>

          {/* Restraint line — Bottega Veneta tone */}
          <motion.p
            variants={fadeUp}
            className="text-[#555555] text-sm tracking-wide mb-10"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Not for everyone. Intentionally.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Link href="/signup" className="btn-gold text-[0.9rem] py-3.5 px-7 flex items-center gap-2">
              Apply for Membership
              <ArrowRight size={15} />
            </Link>
            <Link href="#how-it-works" className="btn-ghost text-[0.9rem] py-3.5 px-7">
              See how it works
            </Link>
          </motion.div>

          {/* Trust bar */}
          <motion.div
            variants={fadeIn}
            className="mt-16 flex flex-col sm:flex-row items-center gap-6 sm:gap-10 text-[#555555] text-xs tracking-wide"
          >
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#C9A84C] opacity-60" aria-hidden="true" />
              No algorithm. Only curation.
            </span>
            <span className="hidden sm:block w-px h-4 bg-white/10" aria-hidden="true" />
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#C9A84C] opacity-60" aria-hidden="true" />
              Identity verified before access
            </span>
            <span className="hidden sm:block w-px h-4 bg-white/10" aria-hidden="true" />
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#C9A84C] opacity-60" aria-hidden="true" />
              India · Dubai · London · New York
            </span>
          </motion.div>

        </motion.div>
      </div>

      {/* ── Scroll indicator ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        aria-hidden="true"
      >
        <span className="text-[#444444] text-[10px] tracking-[0.2em] uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-6 bg-gradient-to-b from-[#444444] to-transparent"
        />
      </motion.div>

      {/* ── Bottom fade — blends into next section ───────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        aria-hidden="true"
        style={{ background: "linear-gradient(to bottom, transparent, #080808)" }}
      />
    </section>
  )
}
