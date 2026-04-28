import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { BillingClient } from "./billing-client"

export default async function BillingPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const subscription = await db.subscription.findUnique({
    where:  { userId: session.user.id },
    select: {
      tier:              true,
      status:            true,
      currentPeriodEnd:  true,
      cancelAtPeriodEnd: true,
      stripeCustomerId:  true,
    },
  })

  const stripeEnabled = !!process.env.STRIPE_SECRET_KEY

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 md:px-10 md:py-12">
      <div className="mb-10">
        <div className="ornament" aria-hidden="true">
          <span className="ornament-dot">✦</span>
        </div>
        <h1
          className="font-[family-name:var(--font-heading)] font-bold text-[#1C1218] tracking-[-0.03em] leading-tight mb-1.5"
          style={{ fontSize: "clamp(1.75rem, 4vw, 2.25rem)" }}
        >
          Billing.
        </h1>
        <p className="text-[#7A6670] text-sm">Manage your membership.</p>
      </div>

      <BillingClient
        subscription={subscription}
        stripeEnabled={stripeEnabled}
      />
    </div>
  )
}
