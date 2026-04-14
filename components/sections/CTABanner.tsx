"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

export default function CTABanner() {
  return (
    <section aria-label="Call to action" className="section bg-[#080808]">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative overflow-hidden rounded-2xl px-8 py-16 md:px-20 md:py-20 flex flex-col items-center text-center"
          style={{
            background: "linear-gradient(135deg, #C9A84C 0%, #E8C96A 50%, #BF9B3A 100%)",
          }}
        >
          {/* Subtle grain on the gold surface */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.06]"
            aria-hidden="true"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
              backgroundRepeat: "repeat",
              backgroundSize: "200px 200px",
            }}
          />

          {/* Radial vignette so edges feel deeper */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.12) 100%)",
            }}
          />

          {/* Content */}
          <div className="relative flex flex-col items-center">
            <p className="text-[rgba(0,0,0,0.45)] text-xs tracking-[0.25em] uppercase font-semibold mb-6">
              Membership is by application only
            </p>

            <h2
              className="font-[family-name:var(--font-heading)] font-bold text-[#1A1100] leading-[1.0] tracking-[-0.03em] mb-6"
              style={{ fontSize: "clamp(2.25rem, 6vw, 4.5rem)" }}
            >
              Your circle
              <br />is waiting.
            </h2>

            <p className="text-[rgba(0,0,0,0.5)] text-base md:text-lg leading-relaxed max-w-sm mb-10">
              Applications take under 5 minutes.
              We review every one personally.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#1A1100] text-[#C9A84C] font-semibold text-sm tracking-wide hover:bg-[#0D0900] transition-colors duration-200 whitespace-nowrap"
              >
                Apply for Membership
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium text-[rgba(0,0,0,0.5)] hover:text-[rgba(0,0,0,0.75)] transition-colors duration-200"
              >
                Already a member? Sign in
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
