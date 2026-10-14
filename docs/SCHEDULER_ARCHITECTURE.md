# Orbit scheduling architecture

Status: proposed production design. Current calendar and publication are review-first, in-memory simulations. This document does not activate a scheduler or Meta publishing.

## Product reference

Use Metricool's publicly documented calendar flow as a product reference: choose brand/channels, customize each channel, preview, save a draft, request review and schedule with a brand timezone. Orbit owns its schema and implementation; Metricool's internal schema and infrastructure are not publicly available for copying.

Sources: https://help.metricool.com/how-to-schedule-content-from-the-calendar-q8ymv and https://metricool.com/content-approval-process/

For Albab's accounts, approval must be explicit. Silence never grants approval. One action may submit approved content to Facebook, Instagram and Threads, but each destination keeps independent status and receipts.

## Proposed records

| Record | Purpose and key constraints |
| --- | --- |
| Workspace / membership | Tenant ownership and role per workspace, verified at every operation |
| Social account | Provider, external account ID, workspace, granted scopes, encrypted credentials, connection status |
| Content / revision | Immutable revision snapshot of copy and media references; edits create a new revision |
| Platform variant | Destination-specific copy, media and format validation, linked to the revision |
| Approval | Actor, timestamp, revision and media digest; revoke on edits |
| Schedule / target | UTC due time plus IANA display timezone, account and approved revision; retain explicit offset for ambiguous daylight-saving times |
| Publishing job / attempt | Unique target-and-revision key, lease, attempt count, sanitized error and next eligible attempt |
| Provider receipt | Container and publication IDs, reconciliation state and confirmed publication URL |
| Outbox / audit event | Transactional dispatch and secret-free history of approval, scheduling and publication |

## Execution

A transaction validates membership, revision, approval and account scope, then creates target jobs plus outbox entries. A dispatcher sends job IDs to Redis/BullMQ. Workers load authoritative records from Postgres, claim a bounded lease and check approval again before contacting Meta. Redis messages carry IDs only, never OAuth tokens. Scheduling writes UTC; the UI displays Asia/Kuala_Lumpur for these accounts.

Each platform worker uses the official supported Meta API for its account type. Instagram/Threads media container creation, readiness and publication remain separate operations. A shared click fans out targets; partial success remains visible and never marks every platform successful.

Retry only known transient failures with bounded backoff and provider rate-limit handling. When a publication response is lost, mark the attempt uncertain and reconcile the provider receipt before another send. A local idempotency key alone does not ensure provider-side exactly-once publication. Terminal authorization errors require reconnecting the account.

## Security and creative operations

Encrypt tokens on the backend with tenant/account-bound authenticated encryption and versioned keys. OAuth state is single-use, expires and is tied to the initiating session. Validate callback destinations and account ownership. Tenant authorization must be checked independently of user-selected workspace headers. Use parameterized database operations and isolation policies.

AI drafting and video rendering produce drafts/assets only. Agents can propose, revise and inspect content; publication follows the same approval and authorization checks regardless of whether initiated by UI, API or MCP. Run rendering in an isolated worker with bounded resources and constrained asset downloads. The News report preset keeps its translucent title panel and date above the title.

## Implementation order

1. Finish security and CI remediation on the existing demo.
2. Add production login, durable workspace membership, revisions, approvals, encrypted account connections and migration tests.
3. Add the transactional scheduler, workers and receipt reconciliation with a fake provider first.
4. Connect official Meta APIs using verified account permissions, then test approved posts on each platform.
5. Add analytics and supervised automation after manual review and publication are reliable.
