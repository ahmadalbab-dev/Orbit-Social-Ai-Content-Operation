# Social Media Automation

A production-minded, multi-tenant content operations platform that turns a brand brief into reviewed, scheduled, and published social content. The first release defaults to mock publishing and strict AI budgets so it is safe and inexpensive to run.

## What works

- Monorepo with Next.js web, NestJS API, Prisma/PostgreSQL, Redis/BullMQ-ready infrastructure, and shared packages.
- Brand profile → structured AI variants → edit/review → schedule → idempotent mock publish → analytics placeholder.
- Eight connector adapters: Facebook, Instagram, LinkedIn, TikTok, YouTube, X, Threads, Pinterest.
- Tenant-scoped data model, Supabase-compatible JWT verification, RBAC schema, encrypted OAuth token vault, rate limiting, audit model, health checks, retries/idempotency primitives.
- AI request hashing, caching contract, structured outputs, usage metering, workspace budget cap, output cap, and inexpensive model routing.

## Quick start

1. Copy missing values from `.env.example` into the private `.env`. Never commit `.env`.
2. Start infrastructure: `docker compose up -d postgres redis`
3. Install: `pnpm install`
4. Generate Prisma: `pnpm db:generate`
5. Apply the development schema: `pnpm db:push`
6. Run: `pnpm dev`
7. Open `http://localhost:3000`; API health is at `http://localhost:3001/v1/health`.

Optional n8n: `docker compose --profile automation up -d n8n`.

## Validation

Run `pnpm check`. End-to-end: `pnpm --filter @sma/web exec playwright install chromium`, then `pnpm --filter @sma/web test:e2e`.

## Safety defaults

- Social publishing is `mock` unless `SOCIAL_CONNECTOR_MODE=live`.
- Production requires valid Supabase JWTs and an `x-workspace-id`.
- OAuth tokens use AES-256-GCM; use a secret manager for `TOKEN_ENCRYPTION_KEY`.
- Duplicate AI prompts resolve through the request hash cache contract.
- The default workspace AI cap is USD 10/month and each response is capped.

See `docs/` for architecture, integrations, security, deployment, costs, and operations.
