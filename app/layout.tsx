import type { Metadata } from "next"
import { Bricolage_Grotesque, DM_Sans, Cormorant_Garamond } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"
import { validateEnv } from "@/lib/env"

// Validate all required environment variables at server startup
validateEnv()

// Display / headings — editorial weight, feels handcrafted not corporate
const bricolage = Bricolage_Grotesque({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
})

// Body / UI — clean, readable at every size
const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

// Serif italic — used for romantic headline accents only
const cormorant = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["italic"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "eclat — India's Most Exclusive Circle",
  description:
    "Every profile human-verified. Every connection curated. Every experience luxury. Join India's most exclusive members-only dating platform.",
  keywords: ["eclat", "premium dating", "verified professionals", "India dating", "NRI dating", "exclusive matchmaking"],
  openGraph: {
    title: "eclat — India's Most Exclusive Circle",
    description: "Every profile human-verified. Every connection curated. Every experience luxury.",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full antialiased",
        bricolage.variable,
        dmSans.variable,
        cormorant.variable,
      )}
    >
      <body className="min-h-full flex flex-col bg-[#FAF7F4] text-[#1C1218] font-[family-name:var(--font-body)]">
        {children}
      </body>
    </html>
  )
}
