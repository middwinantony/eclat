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
          ? "bg-[#FAF7F4]/92 backdrop-blur-xl border-b border-black/[0.07]"
          : "bg-transparent"
      )}
    >
      <div className="container">
        <div className="flex items-center justify-between h-16 md:h-[68px]">

          {/* ── Logo ──────────────────────────────────────────────────── */}
          <Link
            href="/"
            className="flex items-center gap-1.5 group"
            aria-label="eclat home"
          >
            <span
              className={cn(
                "font-[family-name:var(--font-heading)] font-bold text-xl",
                "tracking-[-0.04em] text-[#1C1218]",
                "transition-colors duration-200 group-hover:text-[#A8476A]"
              )}
            >
              eclat
            </span>
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#A8476A] mb-2 opacity-80"
              aria-hidden="true"
            />
          </Link>

          {/* ── Desktop nav links ──────────────────────────────────────── */}
          <nav className="hidden md:flex items-center gap-9" aria-label="Main navigation">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "text-sm font-medium text-[#7A6670]",
                  "hover:text-[#1C1218] transition-colors duration-200",
                  "relative after:absolute after:left-0 after:-bottom-0.5",
                  "after:h-px after:w-0 after:bg-[#A8476A]",
                  "after:transition-[width] after:duration-300 hover:after:w-full"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* ── Desktop CTA ────────────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-[#7A6670] hover:text-[#1C1218] transition-colors duration-200"
            >
              Sign in
            </Link>
            <Link href="/signup" className="btn-rose text-sm">
              Apply for Membership
            </Link>
          </div>

          {/* ── Mobile hamburger ───────────────────────────────────────── */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className="md:hidden p-2 -mr-2 text-[#7A6670] hover:text-[#1C1218] transition-colors"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </SheetTrigger>

            <SheetContent
              side="right"
              className={cn(
                "w-full max-w-[320px]",
                "bg-[#FAF7F4] border-l border-black/[0.07]",
                "flex flex-col p-0"
              )}
            >
              {/* Mobile menu header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-black/[0.07]">
                <Link
                  href="/"
                  className="flex items-center gap-1.5"
                  onClick={() => setOpen(false)}
                >
                  <span className="font-[family-name:var(--font-heading)] font-bold text-xl tracking-[-0.04em] text-[#1C1218]">
                    eclat
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A8476A] mb-2 opacity-80" aria-hidden="true" />
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 text-[#7A6670] hover:text-[#1C1218] transition-colors"
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
                      "text-[#7A6670] hover:text-[#1C1218]",
                      "font-medium text-base py-3",
                      "border-b border-black/[0.05]",
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
                  className="btn-rose w-full justify-center"
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
