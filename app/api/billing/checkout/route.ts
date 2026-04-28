import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import Stripe from "stripe"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// Stripe Price IDs per tier — set these in App Runner env vars after creating
// products in the Stripe dashboard.
const PRICE_IDS: Record<string, string | undefined> = {
  SELECT:  process.env.STRIPE_PRICE_SELECT_MONTHLY,
  RESERVE: process.env.STRIPE_PRICE_RESERVE_MONTHLY,
  NOIR:    process.env.STRIPE_PRICE_NOIR_MONTHLY,
}

const schema = z.object({
  tier: z.enum(["SELECT", "RESERVE", "NOIR"]),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payment system not configured." }, { status: 503 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid tier." }, { status: 422 })
  }

  const { tier } = parsed.data
  const priceId = PRICE_IDS[tier]

  if (!priceId) {
    return NextResponse.json(
      { error: `Price not configured for tier ${tier}. Contact support.` },
      { status: 503 }
    )
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://test.eclat.social"

  // Re-use existing Stripe customer if available
  const subscription = await db.subscription.findUnique({
    where:  { userId: session.user.id },
    select: { stripeCustomerId: true },
  })

  const checkoutSession = await stripe.checkout.sessions.create({
    mode:                "subscription",
    customer:            subscription?.stripeCustomerId ?? undefined,
    customer_email:      subscription?.stripeCustomerId ? undefined : session.user.email,
    line_items:          [{ price: priceId, quantity: 1 }],
    success_url:         `${baseUrl}/dashboard/billing?success=1`,
    cancel_url:          `${baseUrl}/dashboard/billing?cancelled=1`,
    client_reference_id: session.user.id,
    metadata: {
      userId: session.user.id,
      tier,
    },
    subscription_data: {
      metadata: { userId: session.user.id, tier },
    },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
