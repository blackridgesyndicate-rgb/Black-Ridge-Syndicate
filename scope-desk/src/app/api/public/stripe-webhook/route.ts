import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { getWebhookSecret } from "@/lib/stripe";
import { fulfillPaidOrder } from "@/lib/orderFulfillment";

// Public, unauthenticated (Stripe calls this directly) — protected instead
// by verifying the Stripe-Signature header against STRIPE_WEBHOOK_SECRET.
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe-Signature header" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    // Signature verification is pure crypto against the webhook signing
    // secret — it needs no Stripe API key, so this works independently of
    // whether STRIPE_SECRET_KEY (used to create Checkout Sessions) is set.
    event = Stripe.webhooks.constructEvent(rawBody, signature, getWebhookSecret());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-webhook] signature verification failed", message);
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (!orderId) {
      console.error("[stripe-webhook] checkout.session.completed with no orderId metadata", session.id);
      return NextResponse.json({ received: true });
    }

    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) {
      console.error("[stripe-webhook] order not found for id", orderId);
      return NextResponse.json({ received: true });
    }

    // Idempotent: Stripe may redeliver the same event.
    if (order.status === "paid") {
      return NextResponse.json({ received: true, alreadyProcessed: true });
    }

    await fulfillPaidOrder(order.id, {
      stripePaymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
    });
  }

  return NextResponse.json({ received: true });
}
