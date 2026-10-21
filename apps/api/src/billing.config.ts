import { ServiceUnavailableException } from "@nestjs/common";

export type BillingPlan = "creator" | "business";
export const billingPlans: BillingPlan[] = ["creator", "business"];
export function billingEnabled() { return process.env.BILLING_ENABLED === "true"; }
export function billingConfig() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (!billingEnabled() || !/^(rk|sk)_test_\S+$/.test(key) || !/^whsec_\S+$/.test(webhookSecret)) {
    throw new ServiceUnavailableException("Stripe sandbox billing is not configured");
  }
  let origin: string;
  try {
    const url = new URL(process.env.WEB_URL ?? "");
    const local = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname);
    if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error();
    origin = url.origin;
  } catch { throw new ServiceUnavailableException("A trusted WEB_URL origin is required for billing"); }
  const prices = { creator: process.env.STRIPE_PRICE_CREATOR ?? "", business: process.env.STRIPE_PRICE_BUSINESS ?? "" };
  return { key, webhookSecret, origin, prices };
}
export function stripeHostedUrl(value: string | null, host: "checkout.stripe.com" | "billing.stripe.com") {
  try {
    const url = new URL(value ?? "");
    if (url.protocol !== "https:" || url.hostname !== host || url.username || url.password || url.port) throw new Error();
    return url.href;
  } catch { throw new ServiceUnavailableException("Stripe returned an invalid hosted URL"); }
}
