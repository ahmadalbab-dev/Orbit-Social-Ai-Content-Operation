import type Stripe from "stripe";
import type { BillingPlan } from "./billing.config";

export function stripeId(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}
/** Only a paid invoice for this subscription's actual item grants time. No credit refill. */
export function subscriptionSnapshot(subscription: Stripe.Subscription, prices: Record<BillingPlan, string>) {
  const item = subscription.items.data.length === 1 ? subscription.items.data[0] : null;
  const priceId = item?.price.id ?? null;
  const plan = (Object.keys(prices) as BillingPlan[]).find(key => prices[key] && prices[key] === priceId) ?? null;
  const currentPeriodEnd = item ? new Date(item.current_period_end * 1000) : null;
  const invoice = typeof subscription.latest_invoice === "object" ? subscription.latest_invoice : null;
  const invoiceSubscription = stripeId(invoice?.parent?.subscription_details?.subscription);
  const paidLines = invoice?.lines.data.filter(line => line.parent?.subscription_item_details?.subscription_item === item?.id) ?? [];
  const paidEnd = paidLines.length ? Math.min(...paidLines.map(line => line.period.end)) : 0;
  const paidThrough = !subscription.livemode && plan && subscription.status === "active" && !subscription.pause_collection && invoice?.status === "paid" && invoiceSubscription === subscription.id && paidEnd && currentPeriodEnd
    ? new Date(Math.min(paidEnd * 1000, currentPeriodEnd.getTime())) : null;
  return { plan, priceId, status: subscription.status, cancelAtPeriodEnd: subscription.cancel_at_period_end, currentPeriodEnd, paidThrough };
}
export function hasPaidAccess(value: { status: string; paidThrough: Date | null; plan: string | null }, now = Date.now()) {
  return value.status === "active" && value.plan !== null && value.paidThrough !== null && value.paidThrough.getTime() > now;
}
