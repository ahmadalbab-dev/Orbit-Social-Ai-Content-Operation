# Security model and deployment boundary

## Implemented in the current demo

- `AUTH_MODE=local-demo` is explicit and rejected in production. The API defaults to loopback in local demo mode. Docker development ports also bind to loopback; the API listens inside its container on all interfaces.
- JWT mode validates HS256 signature, issuer, audience, expiry and subject. Workspace membership and roles come from signed administrator-controlled `app_metadata`; request headers cannot grant membership. This is a shared-secret integration, not a complete production login/OAuth flow.
- Controller mutations use strict Zod runtime schemas, reject unknown fields and return generic validation errors. JSON/form bodies are capped at 64 KB. Workspace identifiers have bounded syntax. Helmet, configured CORS and a global throttler provide additional controls.
- Brand fields are explicitly projected. In-memory records are bounded: 100 workspaces, 500 brands globally/50 per workspace, 2,000 content records globally/500 per workspace. Generation is serialized per workspace and global capacity is rechecked after asynchronous generation.
- AI cache has 200 entries and 24-hour expiry. Monthly cost aggregates remain after cache eviction and known usage is recorded before parsing provider output. Budget and token configuration is validated. Estimates are not a guaranteed billing ceiling; unknown failed-request billing, restarts and multiple processes require durable accounting.
- Approvals are bound to a content revision; editing invalidates approval. Simulated sends cannot claim real publication. Live publishing fails closed until OAuth and verified accounts are implemented.
- `.env*` is ignored except `.env.example`. Keys belong only in backend secret storage. Meta adapters accept credentials server-side, use fixed provider origins, sanitize errors and do not automatically retry publication.
- Current workflow data lives in memory. No raw SQL execution is present in the workflow path. This does not prove a future database integration is safe: use Prisma parameterization, scoped membership checks and database policies when persistence is connected.

## Required before production

Implement authenticated UI sessions, durable tenant-scoped storage and membership authorization, OAuth state/replay protection, encrypted token storage with rotation, verified account ownership and least-privilege Meta scopes. Enforce database isolation, atomic job claiming, durable approvals, transactional outbox and publication reconciliation. Keep audit logs free of tokens/passwords. Isolate video rendering and constrain asset fetching; configure backups, restore tests and dependency/secret monitoring.

The development Compose credentials are disposable local defaults. Do not deploy Compose unchanged or reuse its passwords. API and secret scans reduce risk; they do not certify protection from every malware or injection attack.
