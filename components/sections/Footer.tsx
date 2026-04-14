import Link from "next/link"

const LINKS = {
  Product: [
    { label: "How It Works", href: "#how-it-works" },
    { label: "Features",     href: "#features"     },
    { label: "Pricing",      href: "#pricing"       },
    { label: "Events",       href: "#events"        },
  ],
  Members: [
    { label: "Apply",        href: "/signup"        },
    { label: "Sign In",      href: "/login"         },
    { label: "FAQ",          href: "#faq"           },
  ],
  Legal: [
    { label: "Privacy Policy",    href: "/privacy"  },
    { label: "Terms of Service",  href: "/terms"    },
    { label: "Cookie Policy",     href: "/cookies"  },
    { label: "Grievance Officer", href: "/grievance"},
  ],
  Company: [
    { label: "About",        href: "/about"         },
    { label: "Contact",      href: "mailto:hello@eclat.app" },
    { label: "Press",        href: "/press"         },
  ],
} as const

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-[#080808] border-t border-white/[0.06]" aria-label="Site footer">
      <div className="container py-16 md:py-20">

        {/* Top row */}
        <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-10 md:gap-8">

          {/* Brand col */}
          <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-1.5 group w-fit" aria-label="eclat home">
              <span className="font-[family-name:var(--font-heading)] font-bold text-lg tracking-[-0.04em] text-[#F5F0E8] group-hover:text-[#C9A84C] transition-colors duration-200">
                eclat
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] mb-1.5 opacity-80" aria-hidden="true" />
            </Link>

            <p className="text-[#444444] text-xs leading-relaxed max-w-[220px]">
              India&rsquo;s most exclusive members-only dating platform. Human-verified. Curated. Private.
            </p>

            <p className="text-[#333333] text-[0.65rem] tracking-wide uppercase mt-2">
              Mumbai · Dubai · London · New York
            </p>
          </div>

          {/* Link columns */}
          {(Object.entries(LINKS) as [string, readonly { label: string; href: string }[]][]).map(
            ([group, items]) => (
              <div key={group} className="flex flex-col gap-4">
                <p className="text-[#555555] text-[0.65rem] tracking-[0.18em] uppercase font-semibold">
                  {group}
                </p>
                <ul className="flex flex-col gap-3">
                  {items.map((item) => (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        className="text-[#444444] text-sm hover:text-[#888888] transition-colors duration-200"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-6 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#333333] text-xs tracking-wide">
            &copy; {year} eclat Technologies Pvt. Ltd. All rights reserved.
          </p>
          <p className="text-[#2A2A2A] text-xs tracking-wide">
            Not for everyone. Intentionally.
          </p>
        </div>

      </div>
    </footer>
  )
}
