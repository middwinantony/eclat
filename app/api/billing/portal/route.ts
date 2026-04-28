import { NextResponse } from "next/server"
import Stripe from "stripe"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payment system not configured." }, { status: 503 })
  }

  const subscription = await db.subscription.findUnique({
    where:  { userId: session.user.id },
    select: { stripeCustomerId: true },
  })

  if (!subscription?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account found." }, { status: 404 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://test.eclat.social"

  const portalSession = await stripe.billingPortal.sessions.create({
    customer:   subscription.stripeCustomerId,
    return_url: `${baseUrl}/dashboard/billing`,
  })

  return NextResponse.json({ url: portalSession.url })
}
