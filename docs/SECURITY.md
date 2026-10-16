# Security model

- Authentication: verified JWTs require issuer, audience, subject, issued-at and expiry. Configure trusted HTTPS JWKS for ES256/RS256, or a minimum 32-character HS256 secret. Development identity requires explicit DEV_AUTH_ENABLED=true and is always disabled in production.
- Authorization: every protected API request loads membership from PostgreSQL rather than trusting x-workspace-id or user-editable metadata. Organization/workspace memberships use `OWNER`, `ADMIN`, `EDITOR`, `APPROVER`, `VIEWER`. Mutations must check required role and tenant.
- Tenant isolation: all business entities carry `workspaceId`; composite uniqueness and indexes make scoped access explicit. Production should add Supabase/Postgres row-level policies as defense in depth.
- Secrets: `.env*` is ignored. Hosting secrets belong in Vercel/backend secret managers. Never expose service-role, encryption, OAuth, or OpenAI keys to the browser.
- OAuth tokens: AES-256-GCM encryption with random IV and versioned keys. Rotate by decrypting and re-encrypting in a controlled job.
- Abuse controls: Helmet headers, strict CORS, request validation, global throttling, bounded AI output, workspace budgets, connector limits.
- Integrity: publishing uses deterministic idempotency keys. Webhooks require timestamped HMAC signatures and replay windows.
- Accountability: approvals, sensitive configuration changes, authentication failures, and publishing actions write audit events.

Before production: enable RLS, complete threat modeling, configure backups/PITR, rotate seeded secrets, restrict CORS, test restore, and run dependency/secret scans.

## Commercial alpha boundaries

The GitHub commercial branch does not inherit the private Sites OAuth token database or its ChatGPT identity. Customer identity, PostgreSQL and a platform HF_TOKEN must be configured separately. Do not copy production secrets into this public repository. Client sessions are held in memory; no service-role or inference secret belongs in browser code.

Failed dispatched AI attempts remain metered against generation allowances so malformed outputs cannot bypass the platform spending limit. Hugging Face monetary cost is not yet priced by the adapter; use the enforced request count plus provider spending controls. This is not a subscription billing ledger.

If PostgreSQL is hosted in Supabase, keep Orbit business tables in a private schema not exposed to the Data API. Before exposing any table, add and verify workspace-aware RLS policies and grants. Current tests exercise API isolation, not a deployed Supabase RLS policy. No public signup deployment should be opened before these checks, email/session configuration and recovery tests pass.

## HTTP and browser credential boundaries

Production browser API requests require an explicitly configured HTTPS origin. URLs with credentials, paths, queries, fragments or local loopback hosts are rejected; missing configuration causes a setup error before fetch. Relative API paths must normalize within `/v1/`. Redirects remain disallowed so bearer headers do not follow a destination change.

The API requires `WEB_URL` to be one exact HTTPS origin in production. Throttling runs before JWT and database membership checks, including failed authentication. This limiter is in memory and per instance; it is not a distributed quota or DDoS guarantee. Configure edge limits for the deployed topology.

Proxy trust is disabled by default. `TRUSTED_PROXY_IPS` accepts only a bounded list of literal IPv4/IPv6 addresses. It rejects wildcards, hostnames, blanket boolean trust and guessed hop counts. Configure it only after identifying actual ingress proxies and restricting direct origin access. Tests exercise spoofed leftmost forwarded IPs and untrusted peer rejection. If no proxy is configured behind an ingress, clients can share the proxy IP bucket; keep that staging private until the ingress configuration is tested.

Scope of this delivery is targeted source review and regression tests for HTTP configuration, credential destinations and guard order. It does not establish full production security, a malware sandbox, penetration-test coverage or a guarantee against compromise. Existing signed Stripe webhooks and workspace-role checks remain required.
