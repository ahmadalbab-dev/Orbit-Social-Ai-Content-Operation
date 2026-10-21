import { randomUUID } from "node:crypto";
import { ServiceUnavailableException } from "@nestjs/common";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { BillingService } from "./billing.service";
import { DatabaseService } from "./database.service";
import { WorkspaceService } from "./workspace.service";
import type { RequestIdentity } from "./security";

// Real PostgreSQL transactions/advisory locks, with only Stripe transport mocked.
describe.skipIf(process.env.ORBIT_DATABASE_TESTS !== "true")("PostgreSQL billing checkout recovery", () => {
  const db = new DatabaseService();
  const organizations: string[] = [];
  const subjects: string[] = [];
  beforeAll(async () => {
    vi.stubEnv("BILLING_ENABLED", "true");
    vi.stubEnv("STRIPE_SECRET_KEY", ["sk", "test", "integration_only"].join("_"));
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", ["whsec", "integration_only"].join("_"));
    vi.stubEnv("STRIPE_PRICE_CREATOR", "price_creator");
    vi.stubEnv("WEB_URL", "https://orbit.example");
    await db.$connect();
  });
  afterAll(async () => {
    await db.organization.deleteMany({ where: { id: { in: organizations } } });
    await db.user.deleteMany({ where: { authUserId: { in: subjects } } });
    await db.$disconnect();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });
  async function fixture() {
    const subject = `billing-checkout-integration-${randomUUID()}`;
    subjects.push(subject);
    const workspace = await new WorkspaceService(db).create({ sub: subject, userId: "", workspaceId: "", role: "" }, { name: "Disposable checkout fixture" });
    const row = await db.workspace.findUniqueOrThrow({ where: { id: workspace.id } });
    organizations.push(row.organizationId);
    const user = await db.user.findUniqueOrThrow({ where: { authUserId: subject } });
    const identity: RequestIdentity = { sub: subject, userId: user.id, workspaceId: workspace.id, role: "OWNER" };
    const customers = new Map<string, { id: string; livemode: boolean; metadata: Record<string, string> }>();
    const sessions = new Map<string, { id: string; livemode: boolean; customer: string; status: string; url: string }>();
    let failAfterCreate = false;
    const stripe = {
      customers: {
        create: vi.fn(async (data: { metadata: Record<string, string> }, options: { idempotencyKey: string }) => {
          if (!customers.has(options.idempotencyKey)) customers.set(options.idempotencyKey, { id: `cus_${randomUUID()}`, livemode: false, metadata: data.metadata });
          return customers.get(options.idempotencyKey)!;
        }),
        retrieve: vi.fn(async (id: string) => {
          const customer = [...customers.values()].find(value => value.id === id);
          if (!customer) throw Error("Unknown fixture customer");
          return customer;
        }),
      },
      subscriptions: { list: vi.fn(async () => ({ has_more: false, data: [] })) },
      prices: { retrieve: vi.fn(async () => ({ livemode: false, active: true, type: "recurring", recurring: { usage_type: "licensed" }, billing_scheme: "per_unit" })) },
      checkout: { sessions: {
        create: vi.fn(async (data: { customer: string }, options: { idempotencyKey: string }) => {
          if (!sessions.has(options.idempotencyKey)) sessions.set(options.idempotencyKey, { id: `cs_${randomUUID()}`, livemode: false, customer: data.customer, status: "open", url: `https://checkout.stripe.com/c/pay/${randomUUID()}` });
          if (failAfterCreate) { failAfterCreate = false; throw Error("Simulated lost provider response"); }
          return sessions.get(options.idempotencyKey)!;
        }),
        retrieve: vi.fn(async (id: string) => {
          const session = [...sessions.values()].find(value => value.id === id);
          if (!session) throw Error("Unknown fixture session");
          return session;
        }),
      } },
    };
    const service = new BillingService(db);
    vi.spyOn(service as unknown as { client(): unknown }, "client").mockReturnValue(stripe);
    return { service, identity, stripe, customers, sessions, loseNextCreateResponse: () => { failAfterCreate = true; } };
  }
  // SERIALIZABLE contenders may return 503 instead of retrying inside the service.
  async function retryTransient<T>(action: () => Promise<T>) {
    for (let attempt = 0; attempt < 8; attempt++) {
      try { return await action(); }
      catch (error) { if (!(error instanceof ServiceUnavailableException) || attempt === 7) throw error; }
    }
    throw Error("Unreachable retry state");
  }
  it("serializes competing checkout intents into one durable customer and session", async () => {
    const f = await fixture();
    const intents = [randomUUID(), randomUUID()];
    const results = await Promise.all(intents.map(requestId => retryTransient(() => f.service.checkout(f.identity, { plan: "creator", requestId }))));
    expect(results[0].url).toBe(results[1].url);
    expect(f.customers.size).toBe(1);
    expect(f.sessions.size).toBe(1);
    const account = await db.billingAccount.findUniqueOrThrow({ where: { workspaceId: f.identity.workspaceId } });
    expect(account.customerId).toBe([...f.customers.values()][0].id);
    expect(account.checkoutSessionId).toBe([...f.sessions.values()][0].id);
    expect(intents).toContain(account.pendingRequestId);
  }, 30000);
  it("rolls back an uncertain remote create while preserving the committed retry intent", async () => {
    const f = await fixture();
    const requestId = randomUUID();
    f.loseNextCreateResponse();
    await expect(f.service.checkout(f.identity, { plan: "creator", requestId })).rejects.toBeInstanceOf(ServiceUnavailableException);
    const interrupted = await db.billingAccount.findUniqueOrThrow({ where: { workspaceId: f.identity.workspaceId } });
    expect(interrupted.pendingRequestId).toBe(requestId);
    expect(interrupted.customerId).not.toBeNull();
    expect(interrupted.checkoutSessionId).toBeNull();
    expect(f.sessions.size).toBe(1); // Provider accepted the request before its response was lost.
    const recovered = await f.service.checkout(f.identity, { plan: "creator", requestId: randomUUID() });
    expect(recovered.url).toBe([...f.sessions.values()][0].url);
    expect(f.sessions.size).toBe(1);
    expect(f.stripe.checkout.sessions.create.mock.calls.map(call => call[1].idempotencyKey)).toEqual([`orbit-checkout-${interrupted.id}-${requestId}`, `orbit-checkout-${interrupted.id}-${requestId}`]);
    expect((await db.billingAccount.findUniqueOrThrow({ where: { workspaceId: f.identity.workspaceId } })).checkoutSessionId).toBe([...f.sessions.values()][0].id);
  }, 30000);
});
