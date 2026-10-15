# Commercial delivery roadmap

The existing Orbit design remains the shared web/mobile visual system. Deliver each capability through the same authenticated workspace model. Never label a preview or unavailable provider as a completed live operation.

| Area | Delivered now | Remaining release work |
| --- | --- | --- |
| 1. Commercial foundation | Verified identity, DB memberships, roles, workspace onboarding, persistent drafts/revisions | Verified email onboarding, recovery/session refresh, tenant quotas, invitations, deletion/export, operational audit events, backups and isolation load tests |
| 2. AI Studio and Brand Memory | Stored voice/audience/language/topics; caption, ideas, rewrite, hashtags and script modes; platform HF inference and attempt quotas | Creative assets retrieval, factual source grounding, safety evaluation in BM/English, cost pricing, model fallback policy and provider availability checks |
| 3. Image Studio | Responsive editing controls and local image workflow | Durable private assets, server-side export validation, background removal/inpainting adapters, licensed model review and metered jobs |
| 4. Video/audio Studio | Preview controls; real isolated-worker MP4 library, News report, timed text | Private-volume upload/queue/cancel/download now implemented for staging; operator setup, scanning, production object storage, retention, worker isolation/deployment and phone acceptance remain. Transcription and voiceover pending. |
| 5. AI editing assistant | Text modes and structured provider output | Proposed edit actions with undo/history, user confirmation before destructive edits, asset-aware tools and evaluated agent permissions |
| 6. Publishing and performance | Revision-bound approval and stored schedules; honest publish preview | Secure Meta OAuth account binding, token renewal/revocation, webhook verification, idempotent delivery workers, platform validation, retries and real analytics |
| 7. Subscription and commercial operations | Schema foundations and per-workspace inference-attempt allowance | Test checkout, signed/idempotent billing webhooks, authoritative entitlement ledger, tier limits, receipts, cancellation, failed-payment handling and customer support |

Detailed checked task list: [TASKS.md](TASKS.md).

## Next implementation sequence

1. Provision an isolated staging database and identity project; verify migration, sign-in, cross-tenant denial and restart persistence. Keep the working private OAuth preview operational.
2. Connect private media assets and a durable job queue to the tested renderer. Use asset IDs at the API boundary, never raw filesystem paths. Test portrait exports from a phone through download.
3. Bring Meta account binding into the commercial API using the existing proven flow, encrypted per-account token context and explicit approval of each test post. Add retry/idempotency tests before automatic schedules.
4. Add billing in test mode; a signed server webhook, not a browser success page, grants entitlements. Decide prices after measuring actual inference/storage/render costs.
5. Expand AI media/edit actions behind plan limits, then run mobile accessibility, security, recovery and payment lifecycle acceptance tests before public launch.

## Verification record for this delivery

Local lint, TypeScript, unit tests and production builds passed. Real FFmpeg MP4 rendering was exercised locally. The initial PR CI quality and secret scan passed, including clean PostgreSQL migrations and the opt-in database integration suite. The final Brand Memory mapping fix adds two passing unit tests and a successful web production build. Browser phone smoke was attempted but remains unverified: Chromium was absent and its download failed. Production identity/provider acceptance has not been exercised. CI results on the latest PR commit are the source of truth.

No production migration, payment product creation, public deployment or real social post is part of this branch delivery.
