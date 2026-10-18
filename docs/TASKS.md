# Orbit build tracker

Status: **Siap** = code implemented and checks named below passed; **Sedang dibuat** = this delivery; **Belum** = remaining work; **Perlu setup** = code needs infrastructure/credentials and live acceptance. An implemented feature is not automatically deployed.

| ID | Tugas | Status | Bukti / baki kerja |
| --- | --- | --- | --- |
| F01 | Design Orbit web/mobile, Light/Dark, motion, icon dock | Siap | Production build; browser phone acceptance still pending |
| F02 | JWT identity and workspace membership/roles | Siap | Unit tests and PostgreSQL CI integration |
| F03 | Database drafts, revision history, approval and saved schedules | Siap | Editing invalidates approval/schedule; CI integration |
| F04 | Commercial sign-in, recovery and renewed sessions | Perlu setup | Email-code recovery and in-memory rotating refresh implemented; late sign-out responses guarded; Orbit identity project provisioned, backend/SMTP/live acceptance pending |
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
- Vercel project `orbit-ai-studio` is live at `https://orbit-ai-studio-two.vercel.app/preview`. Latest verified design release `15773ce` reached READY; CI passed. Albab changed Production Branch Tracking to `feature/commercial-foundation` on 17 October 2026. See [VERCEL_V1.md](VERCEL_V1.md). Cloudflare is not configured.

## Identity delivery, 17 October 2026

- Dedicated Supabase project `orbit-ai-studio` (`lgzyvgmuyrnpwccviqgq`) created in the user-selected MD Tech organisation, Singapore. Provider quoted USD0/month for project creation. ACTIVE_HEALTHY and database connection verified; public tables count is zero. StockPilot was not modified.
- Web sign-in now retains refresh tokens only in memory, rotates them before expiry, serializes refresh requests and rechecks when a phone tab resumes. Token renewal preserves the open editor.
- Password recovery uses an emailed code, verifies it with the identity service, updates the password and discards/revokes the temporary session. Email template must include `{{ .Token }}` before enabling this flow.
- Review fixed late workspace-create responses restoring a signed-out token and guarded late sign-in replies after unmount.
- Public auth settings are not enabled on the live web app yet. API hosting, server DB connection/JWT settings, migrations and real email/recovery tests remain setup work. No HF provider, payment or publishing activation is claimed.

## Backend boundary hardening, 17 October 2026

- Supabase organisation rename to ORBIT verified; project ref is unchanged. Prior identity delivery CI passed all four jobs: quality, secret scan, browser preview and staging images.
- Production frontend no longer defaults authenticated API requests to localhost. API destinations must be a precise HTTPS origin, and API paths cannot normalize outside `/v1/`.
- Production API requires an explicit trusted HTTPS `WEB_URL`. Docker/Compose defaults no longer imply that HTTP localhost is a supported production browser destination. Loopback health checks remain available.
- Rate limiting runs before identity verification/database membership work. A real in-process HTTP test verifies 429 is returned before the 61st invalid identity evaluation. Narrowly configured `TRUSTED_PROXY_IPS` and forwarded-header spoofing tests are included; default proxy trust stays off. This in-memory per-instance limit does not replace edge rate limits or a shared multi-instance limiter.
- AI provider live acceptance, API hosting, private database migrations and SMTP remain pending. No monetary AI budget or malware immunity is claimed.

## Full-width home and AI hosting preparation, 17 October 2026

- Home hero now spans the viewport, with larger animated Orbit identity and quick actions below the hero. Capsule navigation replaces individual tiles; the phone launcher remains compact. Web build and 41 unit tests passed; agent review fixed mobile row direction and light theme cascade.
- Dedicated Vercel project `orbit-ai-studio-api` (`prj_4rEplCiAPm0GhgeIOAx4iiR0uQMh`) created for the existing NestJS API, Node 22 and Singapore. Known nonsecret production identity/origin/alpha settings saved. `DATABASE_URL` and `HF_TOKEN` are still required through secure dashboard entry.
- Native NestJS build configuration and Prisma native/RHEL engine generation prepared. API dependency build passed. No schema migration or provider generation was performed. Media rendering and billing stay off for this private alpha; readiness, SMTP and cross-workspace hosted acceptance remain pending. See [VERCEL_API_SETUP.md](VERCEL_API_SETUP.md).

## Live private alpha activation, 17 October 2026

Completed:
- API `/v1/ready` HTTP 200 against the dedicated Orbit Supabase database.
- Five tracked Prisma migrations applied through the reviewed opt-in Vercel release script; all checksums match repository SQL. Opt-in reset to false afterward.
- All 23 app tables plus Prisma history have RLS. Neither anon nor authenticated can read any of them. Public schema usage revoked before first migration; no exposure window between migrations. Supabase advisors report only the expected informational no-policy findings for private API tables.
- Production web API origin configured; web redeployed with existing dedicated-project public Auth configuration. Supabase email auth and ES256 JWKS are reachable. Unauthenticated workspace requests return 401.
- Agent code review and three opt-in release tests passed; full CI is tracked separately for this revision.

Requires real test identity:
- Supabase Site URL/allowed redirect and email confirmation delivery checked in Auth settings. SMTP/recovery email templates remain operator setup.
- First user signup/confirmation and sign-in, workspace creation, two-user isolation, brand save/reload and one live Hugging Face generation with quota persistence. No Auth users existed at activation inspection; no credentials or confirmation emails were fabricated.
- Phone acceptance on live authenticated Studio. Publishing, billing and cloud video rendering remain disabled.

- Hosted acceptance: API readiness 200, trusted web CORS origin exact match, root sign-in page 200, correct API/Auth origins in shipped browser bundle, and direct anon Data API table read denied (401). CI exposed a cancellation-test timing race; the mock now waits until rendering listens for abort, with additional start/abort assertions and no production worker change. All 10 media tests passed locally.

## Compact account entry, 17 October 2026

- Replaced oversized sign-in/signup view with a 400px responsive form, reused animated Orbit hero, distinct registration/recovery links and password visibility control. Removed the internal-token entry from customer UI.
- Failed login retains the email and clears only the password. Documented provider error codes map to fixed safe guidance; raw provider messages are never reflected. Email whitespace is trimmed without changing password characters.
- Investigation at the reported failure found zero registered Auth users; no password reset, email-confirmation bypass or account fabrication was performed. Actual registration/confirmation and live AI generation still require the user's own account.
- Added phone/desktop browser checks for form size, mobile input sizing, signup/recovery navigation and a fully mocked invalid-credentials response. Browser tests use isolated public fixture configuration, never live credentials.

## Account confirmation and responsive navigation, 17 October 2026

- Verified dedicated Orbit Auth aggregate now contains one registered and confirmed user. Auth logs show signup200, mail sending, verification redirect, and password login200. The reported raw fetch error occurs later in the workspace connection. Live canonical API preflight204 and unauthenticated GET401 had correct exact-origin CORS; original browser transport failure is not conclusively attributed to CORS configuration.
- Added a same-origin workspace relay to remove the cross-origin browser dependency. Only known route/method pairs reach the fixed configured API; backend JWT and membership enforcement remain authoritative. No cookies are forwarded upstream, redirects are rejected and private responses are not cached. Relay body cap is4MiB under Vercel's function limit, so hosted media remains disabled pending direct private object-storage uploads. Do not advertise the backend's100MiB ceiling as the browser relay limit.
- Signup returns to sign-in. Confirmation fragments are removed from history before requests, confirmed identity is checked with the provider, and the temporary link session is revoked locally. Confirmation never creates a workspace session or bypasses explicit password sign-in. Reused/expired links show fixed safe guidance.
- Default Light mode preserves explicit saved theme preferences. Auth hero expands independently of the400px form. Lowercase animated ai studio added; navigation starts minimized on desktop and mobile, expands on pointer hover/tap/keyboard and respects reduced motion.
- Code review,65 web unit tests, TypeScript and production build passed. Browser acceptance fixtures cover signup, confirmation, explicit sign-in and workspace onboarding with synthetic intercepted credentials; actual hosted acceptance is tracked separately.
- Prepared customer email template and SMTP instructions in docs/email. Requested sender display name is aistudio.orbit; live branded SMTP sender configuration still requires an authorized sender address/provider and dashboard access. No new email address, SMTP credential or customer account was invented.

## Workspace recovery, animated identity and media editing, 17 October 2026

- Root cause confirmed from dedicated Orbit PostgreSQL logs: named prepared statements already exist behind Supabase transaction pooling. Runtime Prisma configuration now forces pgbouncer compatibility only for recognized Supabase pooler6543 endpoints, preserves the stored secret and direct/session/migration connections, and bounds default per-function pool size. Five-file fix deployed separately as5a33053.
- Hero alternates Orbit/logo and lowercase ai studio in the same canvas position, ai studio60% of Orbit font size, with9second scenes and code-cell dissolve. The separate small signature is removed. Workflow examples type progressively on visibility; indicator pulses describe illustrative writing/ready states and respect reduced motion. Descriptions enlarged below workflow titles.
- Shared iOS-inspired date picker replaces native video date and Studio schedule date; keyboard navigation, Escape, date-only Malaysia keys, readable touch targets and optional time control included.
- Local video export now genuinely records edited frames/audio on the device, using supported MP4 or WebM (never falsely renamed). Includes trim,0.5–2x speed, volume/mute, rotate/flip, News report title/date, timed captions, progress/cancel and bounded duration/bytes. Keep the tab visible while exporting. Hosted worker rendering remains disabled pending private storage/worker readiness.
- Image controls add crop focus,16:9, colour presets, text styling and explicit AI preview upload. AI results cannot replace local edits while processing; decode failures do not report success.
- Real HF image-edit adapter added for fixed Qwen/Qwen-Image-Edit via fal-ai router, Apache2 model reviewed. PNG/JPEG input2MiB, output4MiB, fixed authenticated queue URLs, strict HTTPSfal.media download allowlist, no bearer on CDN, rejected redirects and bounded timeout. Explicit user action sends only a resized preview/prompt. Server guards and atomic workspace AI quota remain required.
- Video AI proposes title, timed caption copy and scene ideas from a written brief only. It does not watch footage, transcribe audio, automatically cut scenes or promise CapCut parity. Review/apply is explicit. Shares the bounded workspace AI attempt quota.
- Provider tokens were not read, real users were not impersonated and no paid image/video provider acceptance call was made. Live provider permissions/credit, first real Studio generation, image edit and iPhone encoding still require acceptance on the user's signed-in account. SMTP branding is still separate pending verified sender setup.
- Updated stale staging-container headline assertion to current sign-in copy; the earlier staging failure was an outdated UI expectation, not a failed API build. Added short generated video fixture for real browser local-export acceptance.

- Release verification: API production readiness returned200 with database connected; unauthenticated media endpoints returned401. Fixed missing direct Express parser dependency and added runtime dependency assertion. Browser CI run40 passed all12 checks, including a genuine edited video download and phone date selection. Desktop calendar popover alignment is also bounded to the viewport; expanded calendar acceptance covers390px and1440px. Real signed-in provider and iPhone acceptance remain pending.

## Resumed verification and useful AI errors, 17 October 2026 evening

- Recovered the existing commercial branch through `1353551`, including the transaction-pooler fix and subsequent JSON parser regression fix. No replacement application was created. Production API readiness returned HTTP 200 with database connected; unauthenticated workspace access returned 401. GitHub reports the API deployment for `1353551` completed.
- Inspected the live web preview: animated Orbit hero, local video speed/volume/format/export controls, and the working October date-picker popover are present. The browser session is signed out, so authenticated workspace creation and paid-provider output were not exercised. A readiness response does not establish either result.
- Studio and video-plan API failures now preserve fixed, actionable provider messages for timeouts, rate limiting, invalid output and missing configuration. Exhausted workspace dollar budgets return 403 with administrator guidance. Unexpected errors remain masked. Failed dispatched attempts retain quota accounting and do not create successful drafts.
- Video planning now distinguishes a deadline from general unavailability and cancels failed response bodies. Added regressions for safe messages despite mutated provider exception text, budget exhaustion, unchanged attempt accounting, video timeout and failed response cleanup.
- Verification: 90 API tests, 27 AI tests and 77 web unit tests passed. Eight database/billing integration tests were skipped because this isolated checkout has no test database configured. API and AI TypeScript checks and builds passed. Actual iPhone export and authenticated text/image/video provider acceptance remain pending.
- Vercel project/detail/log inspection currently returns 404/403 through the connected tool despite project listing access. Release confirmation must use the Git integration's returned status for the exact commit; do not treat an attempted push or a healthy prior deployment as proof a new change is live.

- Authenticated evening acceptance: user signed in through secure browser authentication and `My Office` loaded with OWNER access without a workspace server error. One explicitly labelled short Facebook test generation reached the provider but returned the bounded unavailable message; no successful draft was created. Both Vercel projects deployed `a09f5e9`, and all four CI jobs passed. Studio provider acceptance therefore remains blocked, rather than complete. Provider HTTP errors now distinguish inference access (401/403), billing/credits (402), unavailable model (404) and rejected request configuration (400/422), using fixed messages without exposing response bodies or secrets. This classification enables the next controlled live diagnosis.

- Follow-up live acceptance after `9782a8d` deployed to both projects: created the separate `Orbit Verification` workspace successfully with OWNER access. A second labelled single-platform Studio attempt in that workspace confirmed provider HTTP 402 through the deployed status classifier: provider billing/credits are unavailable. No AI draft was created or published. Operator action is required on the Hugging Face account billing/credit settings before another provider acceptance call; no purchase, auto-recharge or credential change was attempted. Local verification for this revision passed 94 API and 35 AI tests, TypeScript checks, API/AI builds and compiled runtime checks. Eight local database/billing tests were skipped; the unchanged web suite had 77 passing tests. Changed the setup label so configuration alone no longer claims the AI provider is ready.

- CI for `9782a8d` exposed an intermittent launcher interaction: pointer hover expanded the dock and hid the button before a click completed, allowing a dock item to intercept the pointer. Added a short, cancellable desktop-only hover delay, canceling on pointer-down/leave, navigation and unmount; touch/narrow layouts continue to open by tap/click. Existing hover, keyboard and mobile acceptance remain, with a desktop click regression added. This fixes the interaction rather than weakening test actionability checks.

## Groq testing provider, 18 October 2026

- Added opt-in `AI_TEXT_PROVIDER=groq`, server-only `GROQ_API_KEY` and optional `GROQ_MODEL` defaulting to `openai/gpt-oss-20b`. Studio and brief-only video plans use the fixed Groq endpoint, the same output validators and workspace controls. Explicit Groq selection never falls back to HF or OpenAI if a key is missing or inference fails. Provider-specific cache keys avoid cross-provider reuse.
- Kept HF image editing separate: Groq credentials do not activate image editing. Video plans reserve the same shared quota even without an HF token. Removed the hardcoded Hugging Face label while generating text. GPT-OSS requests use bounded completion tokens, low reasoning effort and no returned reasoning, following Groq's own parameter contract.
- Mocked provider/API tests verify actual request routing, key isolation, parsed draft persistence, no automatic fallback, quota rejection before dispatch, video planning without HF and unchanged image credential requirements. Live Groq acceptance remains pending the operator saving the actual key and redeploying the backend. No key was requested in chat, read or created. Setup: [GROQ_SETUP.md](GROQ_SETUP.md).

## Personal workspace and composition editors, 18 October 2026

- Profile is separate from navigation Settings; header Light/Dark/System follows device theme changes. Device preferences include editable full city names, explicit on-device GPS suggestion, IANA scheduling timezone, date language/format, clock and media landing editor. Coordinates are not transmitted or stored. Preferences are per-browser, not cloud-synced. Calendar and new schedules resolve selected IANA timezone and reject ambiguous/skipped DST times.
- Original editable image template gallery, up to eight photo/logo overlays per slide, layer geometry/opacity/stacking, ten independent carousel slides and ordered PNG/JPEG ZIP export. Video adds five original presets, six timed image layers and colour controls; preview/export use shared canvas rendering. These editors remain local and are not CapCut integrations.
- Conversational AI translates instructions into bounded coherent changes to the active composition: template, colours, copy, format, positions/size/opacity of existing uploaded layers and video timing/pace/captions. Proposed changes require Apply, retain Undo and reject stale editor state. Only text/settings are sent through the selected Groq/HF server endpoint with existing membership, billing and atomic workspace quota controls. No arbitrary code, URLs or media fetches are accepted. It does not see footage, transcribe speech, generate pixels/footage or remove objects. Separate HF pixel editing still requires provider access/credits.
- Local validation: 90 web, 108 API and 53 AI unit tests passed; eight database/billing tests skipped locally. Web production build and TypeScript passed. New browser coverage includes System theme, explicit GPS, image overlay export pixels/carousel ZIP, mobile layout and timed video layers. Browser acceptance and exact-commit deployment tracked in CI; local Chromium download was unavailable.

- Image memory is bounded to 16 megapixels per source and 40 megapixels of unique decoded assets across the carousel. Published revision `050112c` passed all 19 browser checks and all four CI jobs. Final layer-command changes add mocked authenticated browser acceptance for propose, Apply, actual rendered pixels and Undo; real provider acceptance is separate.

- Release `86d3df4` passed all four CI jobs and 20 browser checks, then both production deployment statuses succeeded. Live Settings and media templates were inspected; API readiness returned 200/database connected. A live desktop focus-transfer race in the launcher prompted a follow-up: defer blur/pointer-leave closure until focus has transferred from the hidden launcher, with repeated desktop navigation acceptance. Signed-in real-provider editor acceptance remains unverified in this browser session.


## Mobile editing and durable sessions, 18 October 2026

- Root cause of refresh sign-out: access/refresh session existed only in memory. Added same-origin session endpoint that rotates the configured public identity service refresh token into a Secure/HttpOnly/SameSite=Strict cookie, returns only an in-memory access token, restores on reload and serializes cross-tab refresh/logout. Transient renewal failure keeps persistence for a bounded retry; local sign-out waits for cookie deletion and local provider revoke. No auth tokens in local/session storage. Selected workspace survives reload separately; first login after release establishes persistence.
- Removed workspace picker/create/sign-out from above the main page and placed management in Settings. Workspace name appears below Orbit. Full centered navigation keeps the same six menus as a compact floating row when scrolled. Animated Orbit mark respects reduced motion.
- Image and video editors expose direct layer manipulation and view zoom. Mobile previews stay compact/sticky while controls scroll. Image layouts use actual uploaded photos for equal split, stacked photos and product detail cards; style presets preserve text. Existing base photo now has independently editable scale/position and is correctly described as image1, overlay0 as image2 to AI.
- Uploaded music has local offset, volume and fades; preview/export mix it with original video sound. Image/carousel export can produce a real still/slideshow video with music, progress, cancel and playback. PNG/JPEG remain still images. No licensed music library or synthesized music is claimed.
- Optional preview sharing sends one reduced inline image/current video frame to Groq vision, qwen/qwen3.8-27b by default (GROQ_VISION_MODEL override). Separate Groq text editing stays on its configured model. User must opt in; no automatic media upload or arbitrary URL fetch. Actual local-key synthetic image test returned HTTP200 with valid JSON. Changes remain schema-bounded and require Apply/Undo. Groq vision interprets an image, not full footage or pixel generation.
- HF/fal image status failures now preserve safe access/credit/rate-limit classifications rather than a single generic unavailable message. Music instructions are intercepted before quota/provider dispatch and directed to actual local music controls.
- Channel dead hash links replaced with accessible provider dialogs and status refresh. Backend explicitly reports OAuth is not implemented; connecting real accounts is blocked on authorization/callback implementation plus Meta application credentials/approved redirect and scopes. No connection, publishing worker or account permission is fabricated.
- Local validation before browser CI: 119 web,115 API and60 AI tests passed (8 local database/billing tests skipped). Additional browser acceptance covers refresh/sign-out, same navbar on scroll, touch/zoom, photo layout pixels, decoded exported music audio and Channel dialogs. Browser run and exact-commit production deployment require separate verification.
