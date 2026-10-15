# Stripe sandbox operator guide

Owner: **ORBIT-FIN, Finance**, with **ORBIT-OPS, Operations & Infrastructure**. Reviewed against the billing service on 16 October 2026.

## Current boundary

The selected Stripe environment is the **MD Tech sandbox**, account `acct_1Txo7SRUii0MF8gf`. Account IDs are identifiers, not API credentials. No subscription prices or live billing have been configured by this work. This code accepts sandbox/test keys and rejects live mode. It is not a production payment launch.

The existing Orbit mobile preview is a separate deployment. Its configured social OAuth credentials do not configure this commercial backend. A commercial backend domain is not yet available, so there is no confirmed public webhook URL to paste today. Do not reuse a preview route or invent a domain.

`BILLING_ENABLED=false` is the default. In this disabled alpha, subscription checks are bypassed; existing AI quotas, media limits and role checks still apply. Switch billing on only in the intended sandbox staging deployment after the following configuration and acceptance tests.

## Server configuration

| Variable | Required value |
|---|---|
| `BILLING_ENABLED` | `true` only when intentionally testing the paid sandbox gate |
| `STRIPE_SECRET_KEY` | Prefer a restricted sandbox key beginning `rk_test_`; code also accepts `sk_test_`. Use the selected sandbox's key |
| `STRIPE_WEBHOOK_SECRET` | The signing secret beginning `whsec_` for the exact endpoint or local listener being used |
| `STRIPE_PRICE_CREATOR` | An active sandbox recurring `price_...` for the Creator product |
| `STRIPE_PRICE_BUSINESS` | An active sandbox recurring `price_...` for the Business product |
| `WEB_URL` | The trusted commercial frontend origin, HTTPS in production, with no path/query/fragment. Local HTTP is allowed only outside production |

Put keys and signing secrets in the hosting platform's secret store. Never put them in `NEXT_PUBLIC_*`, mobile bundles, Git, screenshots, logs or this document. Give the API's restricted key only the permissions required by the actual customer, subscription, Price, Checkout Session and billing-portal calls. Verify those permissions using sandbox request logs rather than granting broad account access.

Create **separate Products** for Creator and Business in the selected sandbox. Add a fixed recurring Price to each. The implementation verifies test mode, an active recurring per-unit licensed Price and the server-side plan mapping. It does not accept an arbitrary browser-supplied price. Currency, interval, amounts, tax treatment and final commercial allowances remain business decisions, not values to guess.

Configure the sandbox Customer Portal before testing its button. Initially enable only the management actions being tested, such as updating payment details and cancellation. Portal plan changes must remain limited to the configured catalog; verify reconciliation before offering them publicly.

## Webhook registration

The route contract is **`POST /v1/billing/webhook`** on the commercial API origin. Once that origin is deployed, combine its confirmed HTTPS origin with this path and register it as the sandbox event destination. This path is a Stripe webhook, not a Meta OAuth callback.

Subscribe to the events handled by the current service:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.paused`
- `customer.subscription.resumed`
- `invoice.paid`
- `invoice.payment_failed`

The API requires the **unmodified raw request body** and `Stripe-Signature` header. Signature verification uses the endpoint's signing secret with a five-minute tolerance and rejects live events. Preserve the existing Nest raw-body setup. Do not reconstruct JSON before verification.

Allow Stripe to reach this route without Cloudflare Access login or an interactive browser challenge. Keep the exception narrow and retain signature verification. Test that an unsigned request fails and a valid provider delivery succeeds. Do not disable signatures to work around an edge rule.

Use separate sandbox credentials for development and CI. If forwarding through Stripe CLI locally, the listener's signing secret differs from a Dashboard endpoint secret. A synthetic event alone does not prove a paid workspace: Orbit ignores unknown customer bindings and retrieves current subscription state from Stripe. Complete a real sandbox Checkout through Orbit for meaningful acceptance.

## Access and quota behavior

Only workspace **OWNER/ADMIN** roles can open Checkout or the billing portal. Checkout has a durable pending intent and idempotency behavior; on an uncertain outcome retry the same operation rather than creating a replacement subscription manually.

The Checkout return page does not grant access. The service reconciles current Stripe state and grants costly AI generation/media processing only when the subscription is active, on a recognized plan, and covered by its matching paid invoice item through a future period end. Trialing, canceled, unpaid, paused or expired coverage does not satisfy this policy. Cancellation at period end can retain access only while this paid coverage remains valid. A late event must not revive a canceled subscription.

**Payment or renewal does not refill AI quota.** The existing monthly AI counter is separate, defaulting to 100 attempts through `AI_MONTHLY_GENERATION_LIMIT`. Dispatched failed attempts still count. Creator and Business do not yet have distinct commercial usage allowances.

The alpha media limits remain shared across plans: 100 MiB per upload, 1 GiB reserved workspace upload storage, maximum 120 seconds per render and at most 100 caption segments. These are implementation limits, not finalized subscription promises. Storage retention/deletion and production pricing require separate decisions.

## Rollout acceptance checklist

1. Apply billing database migrations on staging and verify disabled mode leaves existing alpha behavior working.
2. Configure the selected sandbox catalog, portal, server secrets and confirmed webhook destination. Keep live keys absent.
3. As OWNER/ADMIN, complete Checkout with Stripe test payment data. Verify the bound customer/subscription in that sandbox and a signed delivery recorded by the API.
4. Verify paid access, AI quota continuity, portal return, failed payment, required authentication and canceled Checkout. Use a test clock for renewal/expiry scenarios where suitable.
5. Verify duplicate and reordered events, repeat checkout clicks, uncertain network outcomes and expiry do not create duplicate subscriptions or restore invalid access.
6. Verify another workspace and a non-manager cannot manage this workspace's billing. Verify invalid signatures/live events fail, and provider failure does not grant paid access.
7. Test Safari on the actual staging frontend through Checkout, portal and return. Check secrets are absent from client output and logs.

Code tests are not a substitute for these provider-backed checks. Real sandbox acceptance, public endpoint delivery and phone testing remain pending until the deployment and operator configuration exist.

Before a future live launch, review applicable taxes and Stripe Tax registration requirements. Do not enable automatic tax or imply tax collection is configured without confirmed active registrations. Review final pricing, refunds, cancellation terms and live readiness separately.

Official references: [Billing testing](https://docs.stripe.com/billing/testing), [webhook endpoints and signatures](https://docs.stripe.com/events/manage-webhook-endpoints), [restricted keys](https://docs.stripe.com/keys), [Customer Portal](https://docs.stripe.com/customer-management/integrate-customer-portal), [subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks), and [recurring tax setup](https://docs.stripe.com/billing/taxes/collect-taxes).
