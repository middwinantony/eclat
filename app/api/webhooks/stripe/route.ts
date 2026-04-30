import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import Stripe from "stripe"
import { db } from "@/lib/db"

const VALID_TIERS = ["SELECT", "RESERVE", "NOIR"] as const
type ValidTier = typeof VALID_TIERS[number]

const PRICE_TO_TIER: Record<string, ValidTier> = Object.fromEntries(
  [
    [process.env.STRIPE_PRICE_SELECT_MONTHLY,  "SELECT"  as const],
    [process.env.STRIPE_PRICE_RESERVE_MONTHLY, "RESERVE" as const],
    [process.env.STRIPE_PRICE_NOIR_MONTHLY,    "NOIR"    as const],
  ].filter(([priceId]) => !!priceId)
) as Record<string, ValidTier>

function tierFromPriceId(priceId: string): ValidTier | null {
  if (!priceId) return null
  return PRICE_TO_TIER[priceId] ?? null
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get("stripe-signature")

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature ?? "",
      process.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const userId  = session.metadata?.userId
        const tierRaw = session.metadata?.tier

        if (!userId || !tierRaw) break
        if (!(VALID_TIERS as readonly string[]).includes(tierRaw)) break
        const tier = tierRaw as ValidTier

        const stripeSubscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id ?? null

        const stripeCustomerId = typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? null

        // Fetch subscription to get period dates and price ID
        let stripePriceId: string | null = null
        let currentPeriodStart: Date | null = null
        let currentPeriodEnd: Date | null = null

        if (stripeSubscriptionId) {
          const sub  = await stripe.subscriptions.retrieve(stripeSubscriptionId)
          const item = sub.items.data[0]
          stripePriceId      = item?.price.id ?? null
          currentPeriodStart = item?.current_period_start != null ? new Date(item.current_period_start * 1000) : null
          currentPeriodEnd   = item?.current_period_end   != null ? new Date(item.current_period_end   * 1000) : null
        }

        await db.subscription.upsert({
          where:  { userId },
          create: {
            userId,
            tier:                tier,
            status:              "ACTIVE",
            stripeCustomerId,
            stripeSubscriptionId,
            stripePriceId,
            currentPeriodStart,
            currentPeriodEnd,
          },
          update: {
            tier:                tier,
            status:              "ACTIVE",
            stripeCustomerId,
            stripeSubscriptionId,
            stripePriceId,
            currentPeriodStart,
            currentPeriodEnd,
          },
        })

        await db.user.update({
          where: { id: userId },
          data:  { membershipTier: tier },
        })
        break
      }

      case "customer.subscription.updated": {
        const sub    = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (!userId) break

        const priceId  = sub.items.data[0]?.price.id ?? null
        const tier     = priceId ? tierFromPriceId(priceId) : null
        const rawStatus = sub.status

        const statusMap: Record<string, "ACTIVE" | "PAST_DUE" | "CANCELLED" | "TRIALING" | "INCOMPLETE"> = {
          active:    "ACTIVE",
          past_due:  "PAST_DUE",
          canceled:  "CANCELLED",
          trialing:  "TRIALING",
          incomplete: "INCOMPLETE",
        }
        const status = statusMap[rawStatus] ?? "INCOMPLETE"

        await db.subscription.upsert({
          where:  { userId },
          create: {
            userId,
            tier:                tier ?? "SELECT",
            status,
            stripeCustomerId:    typeof sub.customer === "string" ? sub.customer : null,
            stripeSubscriptionId: sub.id,
            stripePriceId:       priceId,
            currentPeriodStart:  sub.items.data[0]?.current_period_start != null ? new Date(sub.items.data[0].current_period_start * 1000) : null,
            currentPeriodEnd:    sub.items.data[0]?.current_period_end   != null ? new Date(sub.items.data[0].current_period_end   * 1000) : null,
            cancelAtPeriodEnd:   sub.cancel_at_period_end,
          },
          update: {
            status,
            stripePriceId:       priceId,
            currentPeriodStart:  sub.items.data[0]?.current_period_start != null ? new Date(sub.items.data[0].current_period_start * 1000) : null,
            currentPeriodEnd:    sub.items.data[0]?.current_period_end   != null ? new Date(sub.items.data[0].current_period_end   * 1000) : null,
            cancelAtPeriodEnd:   sub.cancel_at_period_end,
            ...(tier ? { tier: tier } : {}),
          },
        })

        if (tier) {
          await db.user.update({
            where: { id: userId },
            data:  { membershipTier: tier },
          })
        }
        break
      }

      case "customer.subscription.deleted": {
        const sub    = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (!userId) break

        await db.subscription.updateMany({
          where: { userId },
          data:  { status: "CANCELLED" },
        })

        await db.user.update({
          where: { id: userId },
          data:  { membershipTier: null },
        })
        break
      }
    }
  } catch (err) {
    console.error(`[stripe-webhook] error handling ${event.type}:`, err)
    return NextResponse.json({ error: "Handler error" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
