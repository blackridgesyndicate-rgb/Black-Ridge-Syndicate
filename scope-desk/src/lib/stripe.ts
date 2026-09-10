import "server-only";
import Stripe from "stripe";

let cached: Stripe | null = null;

/** Lazily-constructed Stripe client. Throws a clear error at call time
 * (not at import time) if STRIPE_SECRET_KEY hasn't been configured, so the
 * rest of the app keeps working without Stripe credentials present. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === "sk_test_replace_me") {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured. Set a real Stripe secret key in .env to accept payments — see README."
    );
  }
  if (!cached) {
    cached = new Stripe(key);
  }
  return cached;
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || secret === "whsec_replace_me") {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is not configured. Set the signing secret for your webhook endpoint in .env — see README."
    );
  }
  return secret;
}

export function appBaseUrl(): string {
  return process.env.APP_BASE_URL ?? "http://localhost:3000";
}
