# Orbit delivery checkpoint, 23 October 2026

## Changes and acceptance evidence

- Gemini **real provider inference** passed from Vercel Preview build with synthetic public input for Studio draft generation, Image Editor changes and Video Editor brief planning. Model: `gemini-3.5-flash-lite`; each returned HTTP 200 and passed existing domain validators. Deployment `dpl_5L7D4HxhBN6Gbap7svJgzp2EsiHK`, commit `2479959`. This is provider integration acceptance, not a signed-in user workflow test.
- Earlier actual probes: `gemini-3.1-flash-lite` returned HTTP 503; `gemini-2.5-flash-lite` returned HTTP 404 for this project. No automatic paid fallback was added. Default changes to the live-tested 3.5 model. The probe switch is disabled after testing to avoid repeated provider requests on builds.
- Layers: input photos up to 16MP and 8MiB are prepared into a bounded <=4MP/4096-edge overlay. Original files stay unchanged. Cancellation no longer reports a false 4MP error; invalid formats/decode have separate messages. Resized URLs remain valid through export.
- DESKTOP-ALBAB browser acceptance passed: existing video template/layer export; 12MP overlay import and a decoded red overlay in the exported movie; AI preview-sharing boundary; coherent Apply/Undo; rejection of stale proposals. Provider responses in these browser AI tests are fixtures, not live inference.
- OAuth web callback now accepts the API's 4096-character code limit and rejects CR/LF. A regression test covers 4096/4097 and control characters. This fixes a real boundary mismatch, but does not establish the cause of the user's failed Threads attempt.
- Music: actual Vercel serverless request returned `mode=starter`, `reason=access_denied`, request ID `3d63fbd7-f35d-4955-998a-210d8d83b7bd`. Degraded responses now use no-store and sanitized diagnostics. **Live music search remains failed.** Do not call fallback a successful catalogue integration.
- Ponytail source `assets/v5/site.css` and `site.js`, DESIGN.md, AGENTS.md and reconstruction notes were read from the user-supplied copy. Home hero now adopts source height/spacing/type rules, holographic stops and code glyph metrics, with Orbit-specific title positioning to prevent overlap. MIT attribution is retained. This is an adaptation of Home, not pixel-identical parity for every app screen or source animation.
- Home browser tests passed at 320/390/1440/3840px. Pause/reduced motion, Orbit-to-ai-studio handoff, keyboard tabs and TikTok filter checks passed on the prior positioning; desktop title placement was corrected and all four viewport cases rerun successfully.
- 27 focused Music/overlay/callback unit tests passed; six Node release/probe guard tests passed; five motion unit tests passed; existing OAuth service 60 tests passed during the read-only agent investigation. TypeScript web passed. The Gemini model-default tests are rerun with the final default.
- Earlier PR13 CI quality, secret-scan, staging-images passed. Browser job timed out while installing Ubuntu packages, before app tests. Job allowance changed from 10 to 20 minutes; current-head CI remains a separate gate.

## Current integrated provider evidence

The configured feature Preview at `d9898cabac771c4931a4d11cbcac1bf198df07c9` passed all four actual provider probes: Gemini Studio, Gemini Image Editor with synthetic reduced preview, Gemini Video Editor planning, and Cloudflare pixel editing returning valid image bytes. Probe deployment: `dpl_2amhNTw8GrSQLtK9A9uQNdgqceE2`. The build probe has been switched off.

The subsequent same-code API deployment `dpl_HhXXofjrPZgv7FN7jdwrrFXSFJAH` is ready and returned HTTP 200 from `/v1/ready` with database connected and livePublishing false. No signed-in browser acceptance is implied.

Registered Openverse server-side authentication is now implemented with bounded token exchange, expiry cache, shared in-flight acquisition and rejected-token invalidation. No credentials were present and this mode has not passed a live request. See MUSIC_ACCESS_SETUP.md for exact owner steps.

Current-head CI `39838261153`: quality, secret-scan and staging-images succeeded; web-preview was cancelled. Do not report all-CI success.

## Media and draft acceptance

- Final combined DESKTOP-ALBAB Chrome run: **16/16 passed**. It covers real decoded green-screen video pixels, retained image background/removal/Undo/source reset, two-clip stitch preview and export, both source audio frequencies in order, trim bounds, cancellation with no download, Before/After actual PNG export, Studio destination save/reload/clear, Channels return/status and AI stale-preview/privacy boundaries. AI/OAuth browser network responses are fixtures; these are not live consent/provider UI tests.
- Web unit suite: **231/231 passed** across 34 files. Focused API Workflow/OAuth: **102/102 passed**. Web TypeScript passed after combined integration. API TypeScript passed for the destination changes.
- Studio destination selection is server-validated for ownership, matching platform, connection scopes and future grant expiry. Changes create a new DRAFT revision and remove old schedules. Immutable dispatch snapshots/jobs remain future publishing work.
- Read-only current Orbit database check: one connected Facebook account with one unexpired grant; no Instagram/Threads/TikTok account record. Supabase storage buckets query returned empty. No data or schema was modified.
- Supabase security advisor: no ERROR findings, 25 INFO notices for RLS enabled without policies (server-only tables intentionally deny direct client access), and one WARN for leaked-password protection disabled. This is not a full security certification. Remediation: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . Do not add broad client policies to silence the INFO notices.

## Integration and work order

Use the existing configured `feat/cloudflare-image-editing` Preview as the shared acceptance environment, integrating feature work with a fast-forward after checking its unchanged base. Reuse its database/auth/Cloudflare configuration. Keep production release separate from feature integration. Preview's server-only Gemini configuration uses the tested 3.5 model; the server permits reduced preview sharing, while each editor's independent checkbox remains off by default.

1. Provider inference and API/database readiness, then signed-in Studio/image/video acceptance.
2. Resolve Music provider access and Meta/Threads developer configuration with actual consent results.
3. Stabilize multi-source composition/timeline, crop, chroma key and stitching; validate real output files.
4. Build editable dynamic template recipes on supported engine capabilities.
5. Add connected-account selection and actual provider publishing, with approved permissions, revision binding, quotas and duplicate prevention.

## Remaining product gaps

| Capability | Actual status |
| --- | --- |
| Facebook connection | Prior connected account/grant verified; publishing not proved |
| Instagram | Provider rejected instagram_basic in user's screenshot; app/use-case/permission configuration still needs direct verification |
| Threads | User reported failure; actual provider consent not completed by agent |
| TikTok | App credentials/setup deferred by user; no new developer login attempted |
| Music streaming catalogue | Openverse denies live search; no replacement commercial catalogue credentials supplied |
| Studio and media assistant | Live Gemini provider paths passed; signed-in end-to-end workspace acceptance still required |
| Image pixel editing | Real Cloudflare synthetic request returned a valid image; visual instruction correctness not assessed |
| Green screen/stitch/multi-video timeline | Local chroma key and sequential two-clip stitch passed actual decoded export pixel/audio tests. Simultaneous split screen and native platform Stitch are not implemented |
| Dynamic/trending templates | Before/After recipe passed actual uploaded-photo preview/apply/export/Undo browser acceptance; no verified trending claim |
| Social account selection/publishing | Studio now saves connected destination accounts with revision/approval invalidation. Media uses native Share; direct provider publishing and Media saved destinations are still absent. Channels reports truthful posting capabilities |
| Design | Home source adaptation verified, full application parity incomplete |

No new billing, production promotion, database migration or social post was performed.
