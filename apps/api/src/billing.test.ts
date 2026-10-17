import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import type { DatabaseService } from "./database.service";
import { billingConfig, stripeHostedUrl } from "./billing.config";
import { hasPaidAccess, subscriptionSnapshot } from "./billing.entitlements";
import { BillingService } from "./billing.service";

const identity = { sub: "test", userId: "user", workspaceId: "workspace", role: "OWNER" };
const secret = ["whsec", "unit_only"].join("_");
function subscription(status = "active", paid = "paid") {
  return { id: "sub_test", customer: "cus_test", livemode: false, created: 1, metadata: { workspaceId: "workspace", organizationId: "organization" }, status, cancel_at_period_end: false, pause_collection: null, items: { data: [{ id: "si_test", price: { id: "price_creator" }, current_period_end: 2200000000 }] }, latest_invoice: { status: paid, parent: { subscription_details: { subscription: "sub_test" } }, lines: { data: [{ parent: { subscription_item_details: { subscription_item: "si_test" } }, period: { end: 2200000000 } }] } } } as unknown as Stripe.Subscription;
}
function setup() {
  let account = { id: "billing", workspaceId: "workspace", organizationId: "organization", customerId: "cus_test", subscriptionId: null, status: "none", plan: null, paidThrough: null, pendingRequestId: null, pendingPlan: null, pendingSince: null, checkoutSessionId: null } as Record<string, unknown>;
  const eventIds = new Set<string>();
  const tx = { $executeRaw: vi.fn(), workspace: { findUnique: vi.fn(async () => ({ organizationId: "organization" })) }, billingAccount: { findUnique: vi.fn(async () => account), upsert: vi.fn(async () => account), update: vi.fn(async ({ data }) => account = { ...account, ...data }) }, billingEvent: { findUnique: vi.fn(async ({ where }) => eventIds.has(where.id) ? { id: where.id } : null), create: vi.fn(async ({ data }) => { eventIds.add(data.id); return data; }) } };
  const db = { ...tx, $transaction: vi.fn(async action => action(tx)) };
  const stripe = { customers: { retrieve: vi.fn(async () => ({ id: "cus_test", livemode: false, metadata: { workspaceId: "workspace", organizationId: "organization" } })) }, subscriptions: { list: vi.fn(async () => ({ has_more: false, data: [subscription()] })) }, prices: { retrieve: vi.fn(async () => ({ id: "price_creator", livemode: false, active: true, type: "recurring", recurring: { usage_type: "licensed" }, billing_scheme: "per_unit" })) }, checkout: { sessions: { create: vi.fn(async () => ({ id: "cs_test", livemode: false, url: "https://checkout.stripe.com/c/pay/test" })), retrieve: vi.fn<() => Promise<Record<string, unknown>>>() } }, webhooks: new Stripe(["sk", "test", "unit_only"].join("_")).webhooks };
  const service = new BillingService(db as unknown as DatabaseService);
  vi.spyOn(service as unknown as { client(): unknown }, "client").mockReturnValue(stripe);
  return { service, stripe, tx, db };
}
beforeEach(() => {
  vi.stubEnv("BILLING_ENABLED", "true"); vi.stubEnv("STRIPE_SECRET_KEY", ["rk", "test", "unit_only"].join("_"));
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret); vi.stubEnv("STRIPE_PRICE_CREATOR", "price_creator"); vi.stubEnv("WEB_URL", "https://orbit.example");
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe("sandbox billing boundaries", () => {
  it("rejects live keys and non-origin return URLs", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", ["sk", "live", "unit_only"].join("_")); expect(() => billingConfig()).toThrow();
    vi.stubEnv("STRIPE_SECRET_KEY", ["rk", "test", "unit_only"].join("_")); vi.stubEnv("WEB_URL", "https://orbit.example/redirect"); expect(() => billingConfig()).toThrow();
  });
  it("requires exact Stripe hosted redirect hosts", () => {
    expect(() => stripeHostedUrl("https://checkout.stripe.com.evil.example", "checkout.stripe.com")).toThrow();
    expect(() => stripeHostedUrl("https://attacker@checkout.stripe.com/", "checkout.stripe.com")).toThrow();
  });
  it("leaves disabled alpha access unchanged without touching the database", async () => {
    const { service, db } = setup(); vi.stubEnv("BILLING_ENABLED", "false"); await service.requirePaidAccess("workspace"); expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("denies billing mutation to an editor and rejects browser price IDs", async () => {
    const { service } = setup(); await expect(service.checkout({ ...identity, role: "EDITOR" }, {})).rejects.toThrow();
    await expect(service.checkout(identity, { plan: "creator", requestId: "c132c58b-ac09-4477-8c57-510b01e151ab", priceId: "price_other" })).rejects.toThrow();
  });
});
describe("payment entitlement", () => {
  it("grants only active paid matching invoice items until their covered period ends", () => {
    const snapshot = subscriptionSnapshot(subscription(), { creator: "price_creator", business: "" }); expect(hasPaidAccess(snapshot)).toBe(true);
    expect(hasPaidAccess(snapshot, 2200000000001)).toBe(false);
    expect(hasPaidAccess(subscriptionSnapshot(subscription("active", "open"), { creator: "price_creator", business: "" }))).toBe(false);
    expect(hasPaidAccess(subscriptionSnapshot(subscription("trialing"), { creator: "price_creator", business: "" }))).toBe(false);
    const other = subscription(); (other.latest_invoice as Stripe.Invoice).parent!.subscription_details!.subscription = "sub_other";
    expect(hasPaidAccess(subscriptionSnapshot(other, { creator: "price_creator", business: "" }))).toBe(false);
  });
  it("retrieves current provider state before a costly request and denies a canceled subscription", async () => {
    const { service, stripe } = setup(); stripe.subscriptions.list.mockResolvedValue({ has_more: false, data: [subscription("canceled")] });
    await expect(service.requirePaidAccess("workspace")).rejects.toThrow("active paid"); expect(stripe.subscriptions.list).toHaveBeenCalled();
  });
});
describe("signed webhooks", () => {
  function signed(stripe: ReturnType<typeof setup>["stripe"], id = "evt_test", livemode = false) {
    const payload = JSON.stringify({ id, type: "invoice.paid", livemode, data: { object: { customer: "cus_test" } } });
    return { body: Buffer.from(payload), signature: stripe.webhooks.generateTestHeaderString({ payload, secret }) };
  }
  it("rejects missing, invalid, expired and live-mode signatures/events", async () => {
    const { service, stripe, db } = setup(); const event = signed(stripe);
    await expect(service.webhook(event.body, undefined)).rejects.toThrow(); await expect(service.webhook(event.body, "bad")).rejects.toThrow();
    const expired = stripe.webhooks.generateTestHeaderString({ payload: event.body.toString(), secret, timestamp: 1 }); await expect(service.webhook(event.body, expired)).rejects.toThrow();
    const live = signed(stripe, "evt_live", true); await expect(service.webhook(live.body, live.signature)).rejects.toThrow(); expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("deduplicates events and late paid events cannot restore a canceled subscription", async () => {
    const { service, stripe, tx } = setup(); stripe.subscriptions.list.mockResolvedValue({ has_more: false, data: [subscription("canceled")] }); const event = signed(stripe);
    await service.webhook(event.body, event.signature); await service.webhook(event.body, event.signature);
    expect(tx.billingEvent.create).toHaveBeenCalledTimes(1); expect(tx.billingAccount.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "canceled", paidThrough: null }) }));
  });
  it("never creates ownership bindings from an unknown event customer", async () => {
    const { service, stripe, tx, db } = setup(); tx.billingAccount.findUnique.mockResolvedValue(null as never); const event = signed(stripe);
    await service.webhook(event.body, event.signature); expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("checkout retry and replacement", () => {
  const body = { plan: "creator", requestId: "c132c58b-ac09-4477-8c57-510b01e151ab" };
  it("reuses the durable intent on uncertain provider responses", async () => {
    const { service, stripe } = setup(); stripe.subscriptions.list.mockResolvedValue({ has_more: false, data: [] });
    stripe.checkout.sessions.create.mockRejectedValueOnce(new Error("private provider payload"));
    await expect(service.checkout(identity, body)).rejects.toThrow("Retry the same request");
    await service.checkout(identity, { ...body, requestId: "b322fb6b-13cc-409f-8cbf-51c23821063a" });
    const calls = stripe.checkout.sessions.create.mock.calls as unknown as [unknown, { idempotencyKey: string }][];
    expect(calls[0][1].idempotencyKey).toBe(calls[1][1].idempotencyKey);
    expect(calls[0][0]).toEqual(calls[1][0]);
  });
  it("replaces an expired checkout with a new durable intent even when the client UUID is reused", async () => {
    const { service, stripe, tx } = setup(); stripe.subscriptions.list.mockResolvedValue({ has_more: false, data: [] });
    await tx.billingAccount.update({ data: { checkoutSessionId: "cs_old", pendingRequestId: body.requestId, pendingPlan: "creator", pendingSince: new Date() } });
    stripe.checkout.sessions.retrieve.mockResolvedValue({ status: "expired", customer: "cus_test", livemode: false });
    await service.checkout(identity, body);
    const calls = stripe.checkout.sessions.create.mock.calls as unknown as [unknown, { idempotencyKey: string }][];
    expect(calls[0][1].idempotencyKey).not.toContain(body.requestId);
  });
  it("allows resubscription only when a completed checkout is bound to the proven terminal subscription", async () => {
    const { service, stripe, tx } = setup(); stripe.subscriptions.list.mockResolvedValue({ has_more: false, data: [subscription("canceled")] });
    await tx.billingAccount.update({ data: { checkoutSessionId: "cs_old", pendingRequestId: body.requestId, pendingPlan: "creator", pendingSince: new Date() } });
    stripe.checkout.sessions.retrieve.mockResolvedValue({ status: "complete", subscription: "sub_test", customer: "cus_test", livemode: false });
    await expect(service.checkout(identity, body)).resolves.toHaveProperty("url");
    expect(stripe.checkout.sessions.create).toHaveBeenCalledTimes(1);
  });
  it("refuses to replace an unrelated completed checkout", async () => {
    const { service, stripe, tx } = setup(); stripe.subscriptions.list.mockResolvedValue({ has_more: false, data: [subscription("canceled")] });
    await tx.billingAccount.update({ data: { checkoutSessionId: "cs_old", pendingRequestId: body.requestId, pendingPlan: "creator", pendingSince: new Date() } });
    stripe.checkout.sessions.retrieve.mockResolvedValue({ status: "complete", subscription: "sub_other", customer: "cus_test", livemode: false });
    await expect(service.checkout(identity, body)).rejects.toThrow("being reconciled");
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
});
