# Architecture

## Boundaries

- `apps/web`: accessible content operations dashboard; never receives provider secrets.
- `apps/api`: authentication, tenant boundary, workflow orchestration, rate limiting, health endpoints.
- `packages/database`: authoritative tenant-scoped PostgreSQL schema and Prisma client.
- `packages/ai`: provider adapter, JSON-schema output, deduplication, cache/usage contract, budget enforcement.
- `packages/social-connectors`: stable adapter interface; mock connectors are active by default.
- `packages/ui`, `types`, `config`: shared accessible components, contracts, and validated configuration.

Core scheduling and publishing live in the API. n8n can trigger or receive workflows through signed webhooks, but is not the system of record.

## Production request flow

1. Supabase verifies the user; API validates the JWT and resolves membership.
2. Every query includes `workspaceId`; database policies and service methods enforce the same tenant.
3. Generation checks cache and monthly spend before calling OpenAI.
4. Approval creates an audit event. Scheduling creates one idempotent job per content/platform.
5. BullMQ workers retry transient failures with exponential backoff and connector-specific limits.
6. Provider result and later analytics snapshots are persisted.

## Storage

`MediaAsset.storageProvider` and `storageKey` form the abstraction. Start with Supabase Storage; add S3 or Cloudflare R2 without changing content records.
