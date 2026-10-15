# Orbit Social AI Content Operation

Orbit is a responsive content workspace for creators and businesses. This branch delivers a **commercial alpha foundation**, not a subscription-ready public service. It preserves the approved Orbit visual direction while replacing local draft storage with authenticated workspace APIs.

## Implemented in this branch

- Web/mobile layouts, light/dark appearance, animated Orbit hero, compact icon dock, image editor and video preview controls.
- Verified JWT identity, database membership checks and role restrictions; workspace onboarding and switching.
- PostgreSQL Brand Memory and content revisions. Editing invalidates approval and removes the previous schedule; stale editor requests are rejected.
- Platform-owned Hugging Face text generation: captions, ideas, rewriting, hashtags and scripts. Optional existing OpenAI fallback when HF is unconfigured. Responses are validated; missing credentials produce an explicit error.
- Persistent request usage/cache and an atomic monthly generation-attempt quota (default 100/workspace). Failed dispatched attempts remain metered. Hugging Face dollar costs are **not priced**; the request quota is the enforcement mechanism.
- Real FFmpeg MP4 worker library with trim, portrait/square/landscape output, timed captions and a translucent News report title/date. See [worker documentation](packages/media/README.md).

## Boundaries

Schedules are saved drafts; they do not automatically publish. The publish endpoint returns an explicit preview and sends no social post. The existing private Sites OAuth preview is a separate deployment: its successful account connections and secrets are not migrated here. Connector scaffolding is not proof of live support for every platform.

The FFmpeg worker has not been connected to public uploads, a render queue or downloadable exports. Video controls remain previews until that service is connected. Subscription checkout, signed payment webhooks, plan entitlements, production media storage and live analytics remain release work. The current optional Supabase sign-in stores access tokens in memory and requires signing in again after a reload.

## Local setup

Use Node 22+, pnpm 11.17 and PostgreSQL 16. FFmpeg is needed for real media-render tests.

1. Copy `.env.example` to private `.env`, configure `DATABASE_URL`, then start the development database with `docker compose up -d postgres`.
2. Run `pnpm install --frozen-lockfile`, `pnpm db:generate` and `pnpm db:migrate` against a **new development database**. Existing databases require a reviewed migration-baseline procedure; do not apply the initial CREATE migration blindly.
3. Configure API JWT issuer/audience and either trusted HTTPS JWKS or a legacy HS256 signing secret. Production never enables development auth. For local-only testing, explicitly set `DEV_AUTH_ENABLED=true`.
4. For customer sign-in, set `NEXT_PUBLIC_SUPABASE_URL` and the public anon/publishable key in `apps/web/.env.local` (Next.js reads its app environment). Use the same project as the API JWT issuer. Never place service-role keys or signing secrets in public variables. Alternatively the internal alpha form accepts a valid server-issued JWT.
5. Configure server-only `HF_TOKEN` and an available `HF_MODEL` for platform AI. Without a provider credential, manual drafts work and AI generation reports unavailable.
6. Run `pnpm build` once for workspace packages, then `pnpm dev`. Web: `http://localhost:3000`; API: `http://localhost:3001/v1/health`. Backend scripts read root `.env`; deployed services must receive private environment variables explicitly.

For a Supabase identity project, issuer is `https://PROJECT.supabase.co/auth/v1`, audience usually `authenticated`, and JWKS is `https://PROJECT.supabase.co/auth/v1/.well-known/jwks.json`. Only use signing algorithms enabled for that project. Keep business tables outside a publicly exposed Data API schema unless grants and RLS are verified.

## Validation

`pnpm check` runs lint, TypeScript, unit tests and production builds. CI applies migrations to disposable PostgreSQL and runs the opt-in integration suite with `ORBIT_DATABASE_TESTS=true`. Never enable that suite on a production database. Browser smoke: `pnpm --filter @sma/web test:e2e` with Playwright Chromium installed. Media tests perform a real short MP4 render when FFmpeg is installed; otherwise they skip that case.

See [commercial delivery roadmap](docs/COMMERCIAL_ROADMAP.md), [security](docs/SECURITY.md) and the worker documentation for release requirements.
