import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { DatabaseService } from "./database.service";
import { BillingService } from "./billing.service";

// Uses a disposable PostgreSQL database and an offline Stripe double, never an account key.
describe.skipIf(process.env.ORBIT_DATABASE_TESTS !== "true")("PostgreSQL billing serialization", () => {
  const db = new DatabaseService();
  const service = new BillingService(db);
  const suffix = randomUUID();
  const workspaceId = `billing-workspace-${suffix}`;
  const organizationId = `billing-org-${suffix}`;
  const customerId = `cus_${suffix}`;
  const eventIds: string[] = [];
  const secret = ["whsec", "integration_only"].join("_");
  const sdk = new Stripe(["sk", "test", "integration_only"].join("_"));
  const subscription = {
    id: `sub_${suffix}`, customer: customerId, livemode: false, created: 1,
    metadata: { workspaceId, organizationId }, status: "active", cancel_at_period_end: false,
    pause_collection: null,
    items: { data: [{ id: "si_fixture", price: { id: "price_creator" }, current_period_end: 2200000000 }] },
    latest_invoice: { status: "paid", parent: { subscription_details: { subscription: `sub_${suffix}` } }, lines: { data: [{ parent: { subscription_item_details: { subscription_item: "si_fixture" } }, period: { end: 2200000000 } }] } },
  };
  const provider = {
    webhooks: sdk.webhooks,
    customers: { retrieve: vi.fn(async () => ({ id: customerId, livemode: false, metadata: { workspaceId, organizationId } })) },
    subscriptions: { list: vi.fn(async () => ({ has_more: false, data: [subscription] })) },
  };
  function signed(id: string) {
    eventIds.push(id);
    const payload = JSON.stringify({ id, type: "invoice.paid", livemode: false, data: { object: { customer: customerId } } });
    return [Buffer.from(payload), sdk.webhooks.generateTestHeaderString({ payload, secret })] as const;
  }
  beforeAll(async () => {
    vi.stubEnv("BILLING_ENABLED", "true"); vi.stubEnv("STRIPE_SECRET_KEY", ["rk", "test", "integration_only"].join("_"));
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret); vi.stubEnv("STRIPE_PRICE_CREATOR", "price_creator"); vi.stubEnv("WEB_URL", "https://orbit.example");
    await db.$connect();
    await db.organization.create({ data: { id: organizationId, name: "Billing test", slug: organizationId, workspaces: { create: { id: workspaceId, name: "Billing test", slug: "billing" } } } });
    await db.billingAccount.create({ data: { workspaceId, organizationId, customerId } });
    vi.spyOn(service as unknown as { client(): unknown }, "client").mockReturnValue(provider);
  });
  afterAll(async () => {
    await db.billingEvent.deleteMany({ where: { id: { in: eventIds } } });
    await db.organization.deleteMany({ where: { id: organizationId } });
    await db.$disconnect(); vi.restoreAllMocks(); vi.unstubAllEnvs();
  });
  it("persists verified state and deduplicates signed deliveries in one transaction", async () => {
    const event = signed(`evt_${randomUUID()}`);
    await service.webhook(...event); await service.webhook(...event);
    expect(await db.billingEvent.count({ where: { id: eventIds[0] } })).toBe(1);
    expect(await db.billingAccount.findUnique({ where: { workspaceId } })).toMatchObject({ status: "active", plan: "creator", subscriptionId: subscription.id, paidThrough: new Date(2200000000000) });
  });
  it("serializes concurrent deliveries, safely retrying a serialization conflict", async () => {
    const a = signed(`evt_${randomUUID()}`); const b = signed(`evt_${randomUUID()}`);
    await Promise.allSettled([service.webhook(...a), service.webhook(...b)]);
    // SERIALIZABLE may reject one transaction; Stripe retry must then finish exactly once.
    await service.webhook(...a); await service.webhook(...b);
    expect(await db.billingEvent.count({ where: { id: { in: [a[0], b[0]].map(raw => JSON.parse(raw.toString()).id) } } })).toBe(2);
  });
  it("late invoice events cannot undo current provider cancellation", async () => {
    subscription.status = "canceled";
    await service.webhook(...signed(`evt_${randomUUID()}`));
    expect(await db.billingAccount.findUnique({ where: { workspaceId } })).toMatchObject({ status: "canceled", paidThrough: null });
    await expect(service.requirePaidAccess(workspaceId)).rejects.toThrow("active paid");
  });
});
