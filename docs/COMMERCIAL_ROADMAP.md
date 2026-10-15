# Commercial delivery roadmap

The existing Orbit design remains the shared web/mobile visual system. Deliver each capability through the same authenticated workspace model. Never label a preview or unavailable provider as a completed live operation.

| Area | Delivered now | Remaining release work |
| --- | --- | --- |
| 1. Commercial foundation | Verified identity, DB memberships, roles, workspace onboarding, persistent drafts/revisions | Verified email onboarding, recovery/session refresh, tenant quotas, invitations, deletion/export, operational audit events, backups and isolation load tests |
| 2. AI Studio and Brand Memory | Stored voice/audience/language/topics; caption, ideas, rewrite, hashtags and script modes; platform HF inference and attempt quotas | Creative assets retrieval, factual source grounding, safety evaluation in BM/English, cost pricing, model fallback policy and provider availability checks |
| 3. Image Studio | Responsive editing controls and local image workflow | Durable private assets, server-side export validation, background removal/inpainting adapters, licensed model review and metered jobs |
| 4. Video/audio Studio | Preview controls; real isolated-worker MP4 library, News report, timed text | Authenticated uploads, scanning/transcoding, private storage, durable queue, worker deployment, job progress/cancel/download, transcription, voiceover and captions editor |
| 5. AI editing assistant | Text modes and structured provider output | Proposed edit actions with undo/history, user confirmation before destructive edits, asset-aware tools and evaluated agent permissions |
| 6. Publishing and performance | Revision-bound approval and stored schedules; honest publish preview | Secure Meta OAuth account binding, token renewal/revocation, webhook verification, idempotent delivery workers, platform validation, retries and real analytics |
| 7. Subscription and commercial operations | Schema foundations and per-workspace inference-attempt allowance | Test checkout, signed/idempotent billing webhooks, authoritative entitlement ledger, tier limits, receipts, cancellation, failed-payment handling and customer support |

## Next implementation sequence

1. Provision an isolated staging database and identity project; verify migration, sign-in, cross-tenant denial and restart persistence. Keep the working private OAuth preview operational.
2. Connect private media assets and a durable job queue to the tested renderer. Use asset IDs at the API boundary, never raw filesystem paths. Test portrait exports from a phone through download.
3. Bring Meta account binding into the commercial API using the existing proven flow, encrypted per-account token context and explicit approval of each test post. Add retry/idempotency tests before automatic schedules.
4. Add billing in test mode; a signed server webhook, not a browser success page, grants entitlements. Decide prices after measuring actual inference/storage/render costs.
5. Expand AI media/edit actions behind plan limits, then run mobile accessibility, security, recovery and payment lifecycle acceptance tests before public launch.

## Verification record for this delivery

Local lint, TypeScript, unit tests and production builds passed before the final CI additions. Real FFmpeg MP4 rendering was exercised locally. PostgreSQL integration is explicitly gated and must run against the disposable CI database; no local PostgreSQL service or production identity end-to-end test is assumed. CI results on the pull request are the source of truth after push.

No production migration, payment product creation, public deployment or real social post is part of this branch delivery.
