"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

export default function CTABanner() {
  return (
    <section aria-label="Call to action" className="section bg-[#FAF7F4]">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[1.75rem] px-8 py-20 md:px-20 md:py-24 flex flex-col items-center text-center"
          style={{
            background: "linear-gradient(135deg, #A8476A 0%, #C4688A 50%, #953D5E 100%)",
            boxShadow: "0 24px 80px rgba(168,71,106,0.25)",
          }}
        >
          {/* Shimmer streak */}
          <div className="shimmer-streak" aria-hidden="true" />

          {/* Inner bloom */}
          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(255,255,255,0.07) 0%, transparent 70%)",
            }}
          />

          {/* Grain */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            aria-hidden="true"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
              backgroundRepeat: "repeat",
              backgroundSize: "200px 200px",
            }}
          />

          {/* Content */}
          <div className="relative flex flex-col items-center">
            <p className="text-white/50 text-xs tracking-[0.25em] uppercase font-semibold mb-7">
              Membership is by application only
            </p>

            <h2
              className="text-white leading-[1.0] mb-7"
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontWeight: 500,
                fontSize: "clamp(3rem, 7vw, 5.5rem)",
                letterSpacing: "-0.01em",
              }}
            >
              Your circle
              <br />
              is waiting.
            </h2>

            <p className="text-white/55 text-base md:text-lg leading-relaxed max-w-sm mb-11">
              Applications take under 5 minutes.
              We review every one personally.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 hover:opacity-90"
                style={{
                  background: "rgba(255,255,255,0.92)",
                  color: "#A8476A",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                }}
              >
                Apply for Membership
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium text-white/50 hover:text-white/75 transition-colors duration-200"
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
