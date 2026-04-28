import { CalendarDays } from "lucide-react"

export default function EventsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 md:px-10 md:py-12">
      <div className="mb-8">
        <div className="ornament" aria-hidden="true">
          <span className="ornament-dot">✦</span>
        </div>
        <h1
          className="font-[family-name:var(--font-heading)] font-bold text-[#1C1218] tracking-[-0.03em] leading-tight mb-1.5"
          style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)" }}
        >
          Events.
        </h1>
        <p className="text-[#7A6670] text-sm">Exclusive gatherings for eclat members.</p>
      </div>

      <div className="card p-10 text-center space-y-4">
        <div className="w-10 h-10 rounded-full bg-[#A8476A]/10 border border-[#A8476A]/20 flex items-center justify-center mx-auto">
          <CalendarDays size={18} className="text-[#A8476A]" />
        </div>
        <p className="font-[family-name:var(--font-heading)] font-semibold text-[#1C1218] text-lg">
          Coming soon.
        </p>
        <p className="text-[#7A6670] text-sm leading-relaxed max-w-sm mx-auto">
          Curated in-person and virtual events for verified members — dinners,
          socials, and more. Stay tuned.
        </p>
      </div>
    </div>
  )
}
