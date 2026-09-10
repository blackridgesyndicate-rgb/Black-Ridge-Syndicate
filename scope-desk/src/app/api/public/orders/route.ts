import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseJson, handleApiError, ApiError } from "@/lib/api";
import { orderContactSchema, ORDER_PRICE_CENTS, REPORT_TYPE_COPY } from "@/lib/orderIntake";
import { getStripe, appBaseUrl } from "@/lib/stripe";

// Public, unauthenticated: any prospective customer can start an order.
export async function POST(req: Request) {
  try {
    const data = await parseJson(req, orderContactSchema);
    const amountCents = ORDER_PRICE_CENTS[data.reportType];

    const intake = data.reportType === "insurance" ? data.insuranceIntake ?? {} : data.retailIntake ?? {};

    const order = await db.order.create({
      data: {
        reportType: data.reportType,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone || null,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 || null,
        city: data.city,
        state: data.state.toUpperCase(),
        zip: data.zip,
        intakeJson: JSON.stringify(intake),
        amountCents,
        status: "pending_payment",
      },
    });

    let checkoutUrl: string;
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: data.contactEmail,
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: amountCents,
              product_data: {
                name: `Black Ridge Roofing — ${REPORT_TYPE_COPY[data.reportType].label}`,
                description: `${data.addressLine1}, ${data.city}, ${data.state} ${data.zip}`,
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${appBaseUrl()}/get-estimate/confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appBaseUrl()}/get-estimate?canceled=1`,
        metadata: { orderId: order.id },
      });

      await db.order.update({
        where: { id: order.id },
        data: { stripeCheckoutSessionId: session.id },
      });

      if (!session.url) throw new ApiError(500, "Stripe did not return a checkout URL.");
      checkoutUrl = session.url;
    } catch (stripeErr) {
      // Order is saved either way (so staff can see intake even if payment
      // setup fails), but we surface the failure clearly rather than
      // pretending checkout succeeded.
      const message = stripeErr instanceof Error ? stripeErr.message : "Unknown Stripe error";
      throw new ApiError(502, `Could not start checkout: ${message}`);
    }

    return NextResponse.json({ orderId: order.id, checkoutUrl }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
