# Orbit build tracker

Status: **Siap** = code implemented and checks named below passed; **Sedang dibuat** = this delivery; **Belum** = remaining work; **Perlu setup** = code needs infrastructure/credentials and live acceptance. An implemented feature is not automatically deployed.

| ID | Tugas | Status | Bukti / baki kerja |
| --- | --- | --- | --- |
| F01 | Design Orbit web/mobile, Light/Dark, motion, icon dock | Siap | Production build; browser phone acceptance still pending |
| F02 | JWT identity and workspace membership/roles | Siap | Unit tests and PostgreSQL CI integration |
| F03 | Database drafts, revision history, approval and saved schedules | Siap | Editing invalidates approval/schedule; CI integration |
| F04 | Commercial sign-in, recovery and renewed sessions | Perlu setup | Initial sign-in UI exists; staging identity, recovery and session refresh pending |
| F05 | Team invitations and granular account permissions | Belum | Workspace roles exist; invite lifecycle pending |
| A01 | Hugging Face platform AI writing modes | Siap | Captions, ideas, rewrite, hashtags, script; adapter unit tests |
| A02 | Brand Memory voice, audience, language and topics | Siap | DB persistence and web/API mapping tests |
| A03 | Monthly AI attempt quota and cache | Siap | Atomic quota, persistent usage; real-provider cost reconciliation pending |
| A04 | Provider credentials and real inference acceptance | Perlu setup | Set server HF token/model and test staging; never expose token in client |
| A05 | AI input limits and publication-ready approval checks | Siap | Agent review fixed busy-edit data loss, pre-quota validation and composed platform limits; targeted tests |
| I01 | Local image crop, rotate, flip, colour and text export | Siap | Canvas editor code; phone browser acceptance pending |
| I02 | AI background removal, inpainting and image generation | Belum | Licensed model/provider selection and metered asset jobs |
| V01 | FFmpeg MP4 worker: trim, ratios, News report and captions | Siap | Real local MP4 render test |
| V02 | Authenticated private media upload and workspace quotas | Siap | Code + authorization/stream/quota tests; shared-volume staging setup still required |
| V03 | Durable render queue, recovery, cancellation and download | Siap | PostgreSQL job queue, separate worker, lease/cancel tests; SQL recovery/download integration included in CI |
| V04 | Connect mobile editor to real render jobs | Siap | Upload → queue → status → authenticated download; web tests/build passed, real phone test pending |
| V05 | Production object storage, retention and scanning | Belum | Shared-volume staging is not public production storage |
| V06 | Transcription, auto captions, voiceover and audio tools | Belum | Async provider jobs and timeline UI |
| E01 | AI edit proposals, undo and revision-aware actions | Belum | Apply suggested operations only after user review |
| P01 | Meta account binding in commercial backend | Belum | Existing private Sites OAuth works separately |
| P02 | Delivery worker, retry/idempotency, token renewal | Belum | Saved schedules currently do not publish automatically |
| P03 | Verified webhooks and real platform analytics | Belum | No placeholder metrics labelled as live |
| B01 | Subscription test checkout and customer portal | Perlu setup | Implemented sandbox API + Settings panel; role/URL/idempotency tests passed. MD Tech sandbox catalog, secrets, portal and real provider acceptance pending |
| B02 | Signed billing webhooks and entitlement ledger | Perlu setup | Signature, binding, paid-period and duplicate-event tests/review passed; real PostgreSQL CI and deployed webhook acceptance pending |
| B03 | Invoices, failed payments and cancellation | Perlu setup | Current-provider reconciliation, paid invoice expiry and canceled restart implemented; real sandbox lifecycle/portal acceptance pending |
| Q01 | Agent code review and understandable module boundaries | Siap | Review fixes; media split into controller/service/worker/UI files; new code formatted |
| Q02 | CI build, type checks, tests, secret scan and dependency audit | Siap | PR #2 initial and Brand Memory commits passed; rerun each delivery |
| Q03 | Mobile Safari/browser acceptance | Belum | Local Chromium download failed; real phone test required |
| Q04 | Staging deployment, backup/restore and production readiness | Perlu setup | Docker staging kit + compiled HTTP/MP4 acceptance added; hosting/domain, identity and deployed phone test still required |

## Current delivery

Private staging Dockerfiles/Compose and native-process HTTP acceptance are added. The acceptance test uses generated JWT identities, restarts the API, renders a real fixture through the worker and checks private MP4 download. CI checks on PR #2 are the verification record. No hosting was provisioned and no connected StockPilot project was modified. V02–V04 and A05 remain implemented; hosted acceptance still needs a separate target. Keep the design, human review requirement and working private OAuth preview intact. Stripe integration is now being developed for the selected MDTech sandbox. Pricing, product/price creation and live payment activation remain separate decisions. No social posts are sent during this work. Cloudflare/Firebase hosting is being assessed by ORBIT-OPS; infrastructure has not been provisioned. Department responsibilities are recorded in [AGENT_DEPARTMENTS.md](AGENT_DEPARTMENTS.md).

## Keep code easy to edit

- Use small files by responsibility: HTTP controller, media service, storage helpers, worker, UI and API client.
- Keep validation next to the boundary and share existing rules where useful.
- Use the existing PostgreSQL database for the durable job queue; avoid adding a second queue system for this flow.
- Use asset IDs in requests. Filesystem paths and credentials are server configuration.
- Add focused tests for ownership, limits, cancellation/recovery and approved content. Avoid tests that only repeat CSS or implementation details.

## Evidence

- PR: https://github.com/ahmadalbab-dev/Orbit-Social-Ai-Content-Operation/pull/2
- Initial foundation commit: `6aa6503` (CI quality + secret scan passed).
- Media delivery: `9783c0e` adds private-volume uploads, durable jobs, worker and editor connection. CI checks on PR #2 are the current verification record.
- Update this tracker only when code or verification changes the feature status.

## Stripe sandbox delivery

- Checkout/Portal, signed raw webhook verification, persistent customer/workspace binding, serialized reconciliation and duplicate-event protection implemented.
- AI generation, video upload and render now check paid access when billing is enabled. Existing alpha remains unchanged with `BILLING_ENABLED=false`; no quota refill or invented plan allowances.
- Local lint, typecheck, unit tests and production build passed; production dependency audit reported no known vulnerabilities. PostgreSQL billing/checkout tests and compiled route acceptance are included for CI verification.
- QA found and fixed canceled-subscription restart and expired-checkout retry errors. See [STRIPE_SANDBOX.md](STRIPE_SANDBOX.md), [AGENT_DEPARTMENTS.md](AGENT_DEPARTMENTS.md) and [HOSTING_DECISION.md](HOSTING_DECISION.md).
- This delivery does not deploy Cloudflare, set a live Stripe price, activate real payments or replace the working private OAuth preview.

## Vercel v1 delivery

- Prepared `apps/web/vercel.json` for the `apps/web` monorepo root and dependency-aware build.
- Added explicit `/preview` using existing web/mobile UI and local editors without a demo identity or backend access.
- Setup and actual deployment blocker are recorded in [VERCEL_V1.md](VERCEL_V1.md): project creation returned 403; account administrator setup is needed. No live deployment or Cloudflare protection is claimed.
