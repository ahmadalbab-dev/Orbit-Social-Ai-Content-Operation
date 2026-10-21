import { BadRequestException, ConflictException, ForbiddenException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import Stripe from "stripe";
import { z } from "zod";
import { Prisma, type BillingAccount } from "@sma/database";
import { DatabaseService } from "./database.service";
import type { RequestIdentity } from "./security";
import { billingConfig, billingEnabled, billingPlans, stripeHostedUrl } from "./billing.config";
import { hasPaidAccess, stripeId, subscriptionSnapshot } from "./billing.entitlements";

type Tx = Prisma.TransactionClient;
const checkoutBody = z.object({ plan: z.enum(["creator", "business"]), requestId: z.string().uuid() }).strict();
const events = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "customer.subscription.paused", "customer.subscription.resumed", "invoice.paid", "invoice.payment_failed"]);

@Injectable()
export class BillingService {
  constructor(private readonly db: DatabaseService) {}
  private client() {
    return new Stripe(billingConfig().key, { timeout: 8000, maxNetworkRetries: 0 });
  }
  private manager(identity: RequestIdentity) {
    if (!["OWNER", "ADMIN"].includes(identity.role)) throw new ForbiddenException("Only workspace owners and administrators can manage billing");
  }
  /** All provider reads and projection writes happen under the same workspace lock.
   * A late webhook therefore reads current Stripe state instead of replaying old state. */
  private async locked<T>(workspaceId: string, action: (tx: Tx) => Promise<T>) {
    try {
      return await this.db.$transaction(async tx => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`billing:${workspaceId}`}, 0))`;
        return action(tx);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 45000, maxWait: 5000 });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException || error instanceof ForbiddenException || error instanceof ServiceUnavailableException) throw error;
      // Do not expose provider response bodies or SQL details to a browser.
      throw new ServiceUnavailableException("Billing could not be completed. Retry the same request shortly");
    }
  }
  private async account(tx: Tx, workspaceId: string) {
    const workspace = await tx.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new ForbiddenException("Workspace access denied");
    const account = await tx.billingAccount.upsert({ where: { workspaceId }, create: { workspaceId, organizationId: workspace.organizationId }, update: {} });
    if (account.organizationId !== workspace.organizationId) throw new ForbiddenException("Billing ownership does not match this workspace");
    return account;
  }
  private async customer(tx: Tx, account: BillingAccount, stripe: Stripe) {
    if (account.customerId) return account;
    if (!account.pendingSince || Date.now() - account.pendingSince.getTime() > 23 * 3600 * 1000) throw new ConflictException("Customer setup requires billing reconciliation before retrying");
    const customer = await stripe.customers.create({ metadata: { workspaceId: account.workspaceId, organizationId: account.organizationId } }, { idempotencyKey: `orbit-customer-${account.id}` });
    if (customer.livemode) throw new ServiceUnavailableException("Live billing is not supported");
    return tx.billingAccount.update({ where: { id: account.id }, data: { customerId: customer.id } });
  }
  private async reconcile(tx: Tx, account: BillingAccount, stripe: Stripe) {
    if (!account.customerId) return account;
    const customer = await stripe.customers.retrieve(account.customerId);
    if (customer.deleted || customer.livemode || customer.metadata.workspaceId !== account.workspaceId || customer.metadata.organizationId !== account.organizationId) throw new ForbiddenException("Stripe customer binding could not be verified");
    const listed = await stripe.subscriptions.list({ customer: account.customerId, status: "all", limit: 100, expand: ["data.latest_invoice"] });
    if (listed.has_more) throw new ConflictException("Billing account requires reconciliation");
    const subscriptions = listed.data.filter(sub => !sub.livemode && stripeId(sub.customer) === account.customerId && sub.metadata.workspaceId === account.workspaceId && sub.metadata.organizationId === account.organizationId);
    if (listed.data.some(sub => !["canceled", "incomplete_expired"].includes(sub.status) && !subscriptions.some(owned => owned.id === sub.id))) throw new ConflictException("An unrecognized subscription requires billing reconciliation");
    const current = subscriptions.filter(sub => !["canceled", "incomplete_expired"].includes(sub.status));
    if (current.length > 1) throw new ConflictException("Multiple subscriptions require billing reconciliation");
    const subscription = current[0] ?? subscriptions.sort((a,b) => b.created - a.created)[0];
    if (!subscription) return tx.billingAccount.update({ where: { id: account.id }, data: { status: "none", paidThrough: null, plan: null, subscriptionId: null, reconciledAt: new Date() } });
    const snapshot = subscriptionSnapshot(subscription, billingConfig().prices);
    return tx.billingAccount.update({ where: { id: account.id }, data: { subscriptionId: subscription.id, ...snapshot, reconciledAt: new Date() } });
  }
  async status(identity: RequestIdentity) {
    const enabled = billingEnabled();
    // Disabled alpha never touches Stripe or requires keys.
    const prices = { creator: process.env.STRIPE_PRICE_CREATOR, business: process.env.STRIPE_PRICE_BUSINESS };
    const account = enabled ? await this.db.billingAccount.findUnique({ where: { workspaceId: identity.workspaceId } }) : null;
    return { enabled, mode: "test" as const, plans: billingPlans.map(id => ({ id, label: id === "creator" ? "Creator" : "Business", configured: /^price_\w+$/.test(prices[id] ?? "") })), subscription: account?.subscriptionId ? { plan: account.plan, status: account.status, cancelAtPeriodEnd: account.cancelAtPeriodEnd, currentPeriodEnd: account.currentPeriodEnd } : null, canManage: ["OWNER", "ADMIN"].includes(identity.role) };
  }
  async checkout(identity: RequestIdentity, input: unknown) {
    this.manager(identity);
    const parsed = checkoutBody.safeParse(input);
    if (!parsed.success) throw new BadRequestException("Choose a configured plan and a valid request ID");
    const { plan, requestId } = parsed.data;
    const config = billingConfig();
    const price = config.prices[plan];
    if (!/^price_\w+$/.test(price)) throw new BadRequestException("This subscription plan is not configured");
    // Commit the intent before any remote call. An unknown network outcome cannot create
    // another subscription using a different browser request ID.
    await this.locked(identity.workspaceId, async tx => {
      const account = await this.account(tx, identity.workspaceId);
      if (!account.pendingRequestId) await tx.billingAccount.update({ where: { id: account.id }, data: { pendingRequestId: requestId, pendingPlan: plan, pendingSince: new Date() } });
    });
    const stripe = this.client();
    const existing = await this.locked(identity.workspaceId, async tx => {
      let account = await this.customer(tx, await this.account(tx, identity.workspaceId), stripe);
      account = await this.reconcile(tx, account, stripe);
      if (!["none", "canceled", "incomplete_expired"].includes(account.status)) throw new ConflictException("A subscription already exists. Manage it through the billing portal");
      if (account.checkoutSessionId) {
        const previous = await stripe.checkout.sessions.retrieve(account.checkoutSessionId);
        if (previous.livemode || stripeId(previous.customer) !== account.customerId) throw new ForbiddenException("Checkout customer binding could not be verified");
        if (previous.status === "open") {
          if (account.pendingPlan !== plan) throw new ConflictException("Finish or expire the existing checkout before choosing another plan");
          return { url: stripeHostedUrl(previous.url, "checkout.stripe.com") };
        }
        if (previous.status === "complete" && !(account.subscriptionId === stripeId(previous.subscription) && ["canceled", "incomplete_expired"].includes(account.status))) throw new ConflictException("Payment is being reconciled. Refresh billing status shortly");
        account = await tx.billingAccount.update({ where: { id: account.id }, data: { pendingRequestId: randomUUID(), pendingPlan: plan, pendingSince: new Date(), checkoutSessionId: null } });
      }
      if (account.pendingPlan !== plan) throw new ConflictException("A different plan checkout is pending reconciliation");
      if (!account.pendingSince || Date.now() - account.pendingSince.getTime() > 23 * 3600 * 1000) throw new ConflictException("Checkout requires billing reconciliation before retrying");
      return null;
    });
    if (existing) return existing;
    // A replacement intent is now durable before contacting Stripe. Its new server UUID
    // survives uncertain responses, even when the browser retries an old request ID.
    return this.locked(identity.workspaceId, async tx => {
      const account = await this.reconcile(tx, await this.account(tx, identity.workspaceId), stripe);
      if (!["none", "canceled", "incomplete_expired"].includes(account.status)) throw new ConflictException("A subscription already exists. Use the billing portal");
      if (account.checkoutSessionId) {
        const session = await stripe.checkout.sessions.retrieve(account.checkoutSessionId);
        if (!session.livemode && stripeId(session.customer) === account.customerId && session.status === "open") return { url: stripeHostedUrl(session.url, "checkout.stripe.com") };
        throw new ConflictException("Checkout changed. Refresh billing status and retry");
      }
      if (!account.customerId || !account.pendingRequestId || account.pendingPlan !== plan || !account.pendingSince || Date.now() - account.pendingSince.getTime() > 23 * 3600 * 1000) throw new ConflictException("Checkout requires billing reconciliation before retrying");
      const selected = await stripe.prices.retrieve(price);
      if (selected.livemode || !selected.active || selected.type !== "recurring" || selected.recurring?.usage_type !== "licensed" || selected.billing_scheme !== "per_unit") throw new BadRequestException("A fixed recurring sandbox price is required");
      const integrationSuffix = createHash("sha256").update(account.pendingRequestId).digest("hex")
        .slice(0, 8).replace(/[0-9]/g, digit => String.fromCharCode(103 + Number(digit)));
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: account.customerId,
        client_reference_id: account.workspaceId,
        line_items: [{ price, quantity: 1 }],
        metadata: { workspaceId: account.workspaceId },
        subscription_data: { metadata: { workspaceId: account.workspaceId, organizationId: account.organizationId } },
        success_url: `${config.origin}/?billing=returned`,
        cancel_url: `${config.origin}/?billing=cancelled`,
        integration_identifier: `orbit_${integrationSuffix}`,
      }, { idempotencyKey: `orbit-checkout-${account.id}-${account.pendingRequestId}` });
      if (session.livemode) throw new ServiceUnavailableException("Live billing is not supported");
      const url = stripeHostedUrl(session.url, "checkout.stripe.com");
      await tx.billingAccount.update({ where: { id: account.id }, data: { checkoutSessionId: session.id } });
      return { url };
    });
  }
  async portal(identity: RequestIdentity) {
    this.manager(identity);
    const config = billingConfig();
    const stripe = this.client();
    return this.locked(identity.workspaceId, async tx => {
      const account = await this.reconcile(tx, await this.account(tx, identity.workspaceId), stripe);
      if (!account.customerId) throw new BadRequestException("No billing customer exists yet");
      const session = await stripe.billingPortal.sessions.create({ customer: account.customerId, return_url: config.origin });
      return { url: stripeHostedUrl(session.url, "billing.stripe.com") };
    });
  }
  async requirePaidAccess(workspaceId: string) {
    if (!billingEnabled()) return;
    const stripe = this.client();
    const account = await this.locked(workspaceId, async tx => this.reconcile(tx, await this.account(tx, workspaceId), stripe));
    if (!hasPaidAccess(account)) throw new ForbiddenException("An active paid sandbox subscription is required for AI generation and media processing");
  }
  async webhook(rawBody: Buffer | undefined, signature: string | undefined) {
    const config = billingConfig();
    const stripe = this.client();
    let event: Stripe.Event;
    try {
      if (!Buffer.isBuffer(rawBody) || !signature) throw new Error();
      event = stripe.webhooks.constructEvent(rawBody, signature, config.webhookSecret, 300);
      if (event.livemode) throw new Error();
    } catch { throw new BadRequestException("Invalid Stripe sandbox webhook signature or mode"); }
    if (!events.has(event.type)) return { received: true };
    const object = event.data.object as { customer?: string | { id: string } | null };
    const customerId = stripeId(object.customer);
    const binding = customerId ? await this.db.billingAccount.findUnique({ where: { customerId } }) : null;
    if (!binding) return { received: true }; // Never create workspace/customer bindings from event metadata.
    await this.locked(binding.workspaceId, async tx => {
      if (await tx.billingEvent.findUnique({ where: { id: event.id } })) return;
      const account = await this.account(tx, binding.workspaceId);
      await this.reconcile(tx, account, stripe);
      await tx.billingEvent.create({ data: { id: event.id, type: event.type } });
    });
    return { received: true };
  }
}
