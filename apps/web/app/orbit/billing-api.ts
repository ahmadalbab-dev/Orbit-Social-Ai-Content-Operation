import { api } from "./session-api";

export type BillingPlan = "creator" | "business";
export type BillingStatus = {
  enabled: boolean;
  mode: "test";
  plans: { id: BillingPlan; label: string; configured: boolean }[];
  subscription: {
    plan: string | null;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
  } | null;
  canManage: boolean;
};

export const getBillingStatus = () => api<BillingStatus>("/billing/status");

/** Keep each intent's UUID across network failures so retries reuse the session. */
export function checkoutAttempts(uuid: () => string = () => crypto.randomUUID()) {
  const attempts = new Map<BillingPlan, string>();
  return (plan: BillingPlan) => {
    const requestId = attempts.get(plan) ?? uuid();
    attempts.set(plan, requestId);
    return { plan, requestId };
  };
}

export function stripeRedirectUrl(value: unknown, kind: "checkout" | "portal") {
  const message = "The payment link could not be verified. Refresh billing and try again.";
  if (typeof value !== "string") throw Error(message);
  let url: URL;
  try { url = new URL(value); } catch { throw Error(message); }
  const host = kind === "checkout" ? "checkout.stripe.com" : "billing.stripe.com";
  if (url.protocol !== "https:" || url.hostname !== host || url.port || url.username || url.password)
    throw Error(message);
  return url.href;
}

export async function createCheckout(intent: { plan: BillingPlan; requestId: string }) {
  const result = await api<{ url: string }>("/billing/checkout", "POST", intent);
  return stripeRedirectUrl(result.url, "checkout");
}

export async function createBillingPortal() {
  const result = await api<{ url: string }>("/billing/portal", "POST", {});
  return stripeRedirectUrl(result.url, "portal");
}
