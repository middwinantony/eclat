"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"

const NAV_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features",     href: "#features"     },
  { label: "Pricing",      href: "#pricing"       },
  { label: "Events",       href: "#events"        },
] as const

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen]         = useState(false)

  // Add backdrop blur + border only after user scrolls past 20px
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-[#080808]/80 backdrop-blur-xl border-b border-white/[0.07]"
          : "bg-transparent"
      )}
    >
      <div className="container">
        <div className="flex items-center justify-between h-16 md:h-18">

          {/* ── Logo ──────────────────────────────────────────────────── */}
          <Link
            href="/"
            className="flex items-center gap-2 group"
            aria-label="eclat home"
          >
            {/* Wordmark — Bricolage Grotesque, gold on hover */}
            <span
              className={cn(
                "font-[family-name:var(--font-heading)] font-bold text-xl",
                "tracking-[-0.04em] text-[#F5F0E8]",
                "transition-colors duration-200 group-hover:text-[#C9A84C]"
              )}
            >
              eclat
            </span>
            {/* Subtle gold dot — signals luxury without shouting it */}
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] mb-2 opacity-80"
              aria-hidden="true"
            />
          </Link>

          {/* ── Desktop nav links ──────────────────────────────────────── */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "text-sm font-medium text-[#888888]",
                  "hover:text-[#F5F0E8] transition-colors duration-200",
                  "relative after:absolute after:left-0 after:-bottom-0.5",
                  "after:h-px after:w-0 after:bg-[#C9A84C]",
                  "after:transition-[width] after:duration-300 hover:after:w-full"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* ── Desktop CTA ────────────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-[#888888] hover:text-[#F5F0E8] transition-colors duration-200"
            >
              Sign in
            </Link>
            <Link href="/signup" className="btn-gold text-sm">
              Apply for Membership
            </Link>
          </div>

          {/* ── Mobile hamburger ───────────────────────────────────────── */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className="md:hidden p-2 -mr-2 text-[#888888] hover:text-[#F5F0E8] transition-colors"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </SheetTrigger>

            <SheetContent
              side="right"
              className={cn(
                "w-full max-w-[320px]",
                "bg-[#0E0E0E] border-l border-white/[0.07]",
                "flex flex-col p-0"
              )}
            >
              {/* Mobile menu header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
                <Link
                  href="/"
                  className="flex items-center gap-2"
                  onClick={() => setOpen(false)}
                >
                  <span className="font-[family-name:var(--font-heading)] font-bold text-xl tracking-[-0.04em] text-[#F5F0E8]">
                    eclat
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] mb-2 opacity-80" aria-hidden="true" />
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 text-[#888888] hover:text-[#F5F0E8] transition-colors"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Mobile nav links */}
              <nav className="flex flex-col px-6 py-6 gap-1 flex-1" aria-label="Mobile navigation">
                {NAV_LINKS.map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "text-[#888888] hover:text-[#F5F0E8]",
                      "font-medium text-base py-3",
                      "border-b border-white/[0.05]",
                      "transition-colors duration-200"
                    )}
                  >
                    {label}
                  </Link>
                ))}
              </nav>

              {/* Mobile CTAs */}
              <div className="flex flex-col gap-3 px-6 pb-8 pt-2">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="btn-ghost w-full justify-center"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="btn-gold w-full justify-center"
                >
                  Apply for Membership
                </Link>
              </div>
            </SheetContent>
          </Sheet>

        </div>
      </div>
    </header>
  )
}
