# Security model

- Authentication: Supabase Auth JWTs. Local bypass is permitted only outside production when no JWT secret exists.
- Authorization: organization/workspace memberships use `OWNER`, `ADMIN`, `EDITOR`, `APPROVER`, `VIEWER`. Mutations must check required role and tenant.
- Tenant isolation: all business entities carry `workspaceId`; composite uniqueness and indexes make scoped access explicit. Production should add Supabase/Postgres row-level policies as defense in depth.
- Secrets: `.env*` is ignored. Hosting secrets belong in Netlify/backend secret managers. Never expose service-role, encryption, OAuth, or OpenAI keys to the browser.
- OAuth tokens: AES-256-GCM encryption with random IV and versioned keys. Rotate by decrypting and re-encrypting in a controlled job.
- Abuse controls: Helmet headers, strict CORS, request validation, global throttling, bounded AI output, workspace budgets, connector limits.
- Integrity: publishing uses deterministic idempotency keys. Webhooks require timestamped HMAC signatures and replay windows.
- Accountability: approvals, sensitive configuration changes, authentication failures, and publishing actions write audit events.

Before production: enable RLS, complete threat modeling, configure backups/PITR, rotate seeded secrets, restrict CORS, test restore, and run dependency/secret scans.
