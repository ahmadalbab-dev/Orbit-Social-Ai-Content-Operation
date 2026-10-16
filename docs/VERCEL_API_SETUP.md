# Activate Orbit Studio AI with a separate API

This recipe deploys the existing NestJS API for authenticated cloud drafts and text AI. It does not deploy an FFmpeg daemon, share the old Sites database, migrate existing Sites OAuth tokens, enable live social publishing, or charge customers. No infrastructure has been provisioned by this document.

API project prepared by the parent workflow: `orbit-ai-studio-api` (`prj_4rEplCiAPm0GhgeIOAx4iiR0uQMh`), Root Directory `apps/api`, NestJS, Node 22, source outside root enabled, Fluid Compute in Singapore. This is project configuration only; database credentials, live provider verification and successful API deployment remain unconfirmed.

## Recommended minimal topology

- Keep the existing Next.js web project `orbit-ai-studio`.
- Import the **same GitHub repository** a second time as `orbit-ai-studio-api` with Root Directory `apps/api` and framework **NestJS**. Use the intended `feature/commercial-foundation` revision, not an older default branch.
- Enable inclusion of source outside the Root Directory for the monorepo. Keep Node 22.x and the repository-pinned pnpm version. `apps/api/vercel.json` defines install/build commands, a 60-second ceiling for the existing bounded AI request, and Prisma generated-file inclusion.
- Use a dedicated Orbit PostgreSQL database and identity project, for example Supabase Auth and Postgres. Application traffic must use a provider-compatible pooled PostgreSQL URL with TLS; execute migrations separately using a direct connection.
- Leave `MEDIA_RENDER_ENABLED=false` and `BILLING_ENABLED=false` for private alpha. Do not supply a fake API URL or enable development auth on the hosted API.

Vercel recognizes `src/main.ts` and its Nest bootstrap directly. An old Express-to-serverless adapter is unnecessary. A successful local Nest build is not proof the Vercel bundle contains the Prisma engine: verify a real `/v1/ready` request after deployment before activating the web client.

### Prisma platform check before first deployment

The Prisma v6 generator includes both `native` and `rhel-openssl-3.0.x`, the Node 22 Vercel runtime target. Regenerate during the dependency build and verify the deployed function bundle. Do not blindly use a binary generated on a different operating system. The `includeFiles` configuration copies generated files but does not generate a missing platform engine.

## API environment variables

The parent workflow has already saved the production nonsecret values for `WEB_URL`, `DEV_AUTH_ENABLED`, `MEDIA_RENDER_ENABLED`, `BILLING_ENABLED`, `AI_MONTHLY_GENERATION_LIMIT` and the three JWT issuer/audience/JWKS variables for the dedicated Orbit Supabase project. `DATABASE_URL` and `HF_TOKEN` are still missing.

Go to **Vercel Dashboard → orbit-ai-studio-api → Settings → Environment Variables**. Add each variable to the intended environment; use separate databases and credentials for Preview and Production. Store credentials as Secret. Configuration changes require a new deployment.

| Name | Value source | Type |
| --- | --- | --- |
| `DATABASE_URL` | Orbit PostgreSQL pooled connection string, with TLS | Secret |
| `HF_TOKEN` | Hugging Face fine-grained token with Inference Providers call permission | Secret |
| `HF_MODEL` | Optional supported model; code default is `Qwen/Qwen3-235B-A22B-Instruct-2507` | Config |
| `WEB_URL` | Exact deployed web HTTPS origin, e.g. `https://orbit-ai-studio-two.vercel.app`, no `/preview` or other path | Config |
| `AUTH_JWT_ISSUER` | Identity project's issuer, for Supabase `https://<project-ref>.supabase.co/auth/v1` | Config |
| `AUTH_JWT_AUDIENCE` | For Supabase signed-in user access tokens: `authenticated` | Config |
| `AUTH_JWKS_URL` | For Supabase asymmetric keys: `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json` | Config |
| `AUTH_JWT_SECRET` | Only for explicitly chosen legacy HS256 identity; leave unset with JWKS | Secret |
| `AI_MONTHLY_GENERATION_LIMIT` | Small positive integer quota per workspace, e.g. `100` | Config |
| `DEV_AUTH_ENABLED` | `false` | Config |
| `MEDIA_RENDER_ENABLED` | `false` | Config |
| `BILLING_ENABLED` | `false` for private alpha | Config |

Vercel supplies production `NODE_ENV`; do not override it to development to bypass authentication. Leave `TRUSTED_PROXY_IPS` unset until exact trusted proxy IPs are established. Do not trust wildcard forwarded IP headers. Current in-process throttling is per function instance, so commercial scaling still needs a shared rate limiter.

The JWT verification requires issuer, audience, expiry and issued-at claims. A signed identity alone does not grant workspace access: the backend validates persisted membership. Customer sign-in/create-workspace comes before AI generation.

`HF_TOKEN` is the platform's token, not an end-customer setup requirement. A configured token is not proof of available credits or working model access. The runtime reports provider availability/errors; verify one real generation from an approved test workspace. HF usage can incur charges even when Orbit billing is disabled; keep workspace generation limits small and manage the provider budget.

## Database migration and identity

Run `pnpm db:migrate` in a trusted deployment task with `DATABASE_URL` temporarily set to the **direct** connection string. The existing schema only reads `DATABASE_URL`; `DIRECT_URL` is not consumed. Do not paste either URL into frontend settings or chat. New databases apply all tracked migrations. Existing installations must follow the migration baseline instructions before migration deployment; never run a reset against user data.

Set the identity provider's allowed web URLs to the actual web origin. The frontend uses the public identity project URL and publishable/anon key, not the service-role key. PostgreSQL tables are accessed through the API; review and enforce deny-by-default Data API privileges/RLS before exposing a database through Supabase's REST interface.

## Web project environment variables

In **orbit-ai-studio → Settings → Environment Variables**, configure and rebuild:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Actual API HTTPS **origin**, with no `/v1` suffix |
| `NEXT_PUBLIC_SUPABASE_URL` | Orbit identity project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public publishable/anon key from that project |

The client appends `/v1` itself. A secret under a `NEXT_PUBLIC_*` name would be exposed to browsers. Do not put `HF_TOKEN`, database passwords, JWT signing secrets or Stripe secret keys in these fields.

Keep private staging protected. If Vercel deployment protection prevents the browser reaching the API or the provider delivering webhooks, establish an approved access policy for that API project. Never embed a Vercel protection-bypass token in the browser bundle or remove all protection as a shortcut.

## Validation before calling AI activated

1. Confirm API deployment is READY for the intended Git commit.
2. Confirm `GET /v1/health` and real `GET /v1/ready` through the approved access path; readiness must reach PostgreSQL.
3. Sign in on web, create a workspace, save Brand Memory and reload it in a second browser/device.
4. Confirm an unrelated account cannot access the first workspace.
5. Generate one short text draft; verify the actual provider response, persisted draft and quota increment. Do not log prompt credentials or provider authorization headers.
6. Confirm AI failure has a useful error and does not falsely report success. `/preview` intentionally cannot make authenticated cloud AI calls.

With `BILLING_ENABLED=false`, `BillingService.requirePaidAccess` returns without calling Stripe. Stripe secrets and test subscription are therefore **not required for this private alpha**. If sandbox billing is enabled later, configure the documented test-only Stripe keys, price IDs and webhook route; the paid entitlement gate then applies.

## Video is a separate deployment decision

The current API upload/download and `apps/media-worker` use a shared private filesystem volume. They cannot share a persistent disk across stateless Vercel functions and a remote worker. Large video requests also exceed Vercel's 4.5 MB function request/response limit.

For media production, choose one reviewed implementation:

- Deploy the existing API and media worker together on a container host with a shared persistent private volume, using the existing staging compose files; the Vercel web can call that HTTPS API.
- Or replace local-volume uploads/downloads with authenticated direct object-storage transfers and short-lived signed URLs, then have a separate container render worker fetch/write objects. This requires code changes before enabling media on the Vercel API.

Cloudflare Workers are not a drop-in host for the existing NestJS + Prisma native engine + FFmpeg processes. A Workers migration would be a separate backend redesign. Cloudflare DNS/security in front of the selected origin does not require rewriting the API.

## Official references checked

- https://vercel.com/docs/frameworks/backend/nestjs
- https://vercel.com/docs/environment-variables/managing-environment-variables
- https://vercel.com/docs/functions/limitations
- https://www.prisma.io/docs/orm/v6/prisma-client/deployment/serverless/deploy-to-vercel
- https://huggingface.co/docs/inference-providers/en/guides/first-api-call

## Requested custom web domain, 17 October 2026

Albab requested `https://orbit.aistudio.app`. Vercel currently reports `verified=false` and requires DNS ownership proof for the parent zone `aistudio.app`. Adding a name to the project does not register or purchase it. Treat the new origin as pending until ownership, DNS routing and HTTPS are verified. Keep the working web origin in API `WEB_URL` and Supabase Auth configuration until cutover; do not send identities or credentials to an unverified destination.

After verification: update API `WEB_URL`, Supabase Site URL/allowed redirects and the documented canonical web origin, then rebuild/redeploy and test CORS, sign-in and recovery. The separate API origin and JWT issuer/JWKS stay unchanged unless their own domains are deliberately migrated. Existing private Sites Meta/Threads OAuth callbacks must stay on their deployed backend until commercial routes exist. No custom-domain DNS writes or auth-origin switch were performed in this preparation.
