# ai studio by Orbit

A configurable content writing and video workspace for businesses and creators. Create Facebook, Instagram and Threads drafts, edit them, approve the exact revision and record a schedule. Live publishing is inactive; simulations are explicitly labeled SIMULATED.

## Implemented

- Business/creator profile with audience, voice, topics and language, saved in this browser.
- Content Studio with editable captions, hashtags and CTA; separate draft saving and owner approval.
- Revision-aware API workflow: edits invalidate approval; scheduling requires a future timestamp and current approval.
- Calendar shows actual demo schedule records in Malaysia time instead of sample metrics.
- News report local-video preview, transparent title/date controls, settings export and standalone Remotion renderer under tools/news-report.
- Explicit local demo auth, signed workspace/role checks outside local demo, and mounted API guard.
- Server-only Meta API adapters for Facebook Page text/photo, Instagram image/Reel via Facebook Login, Threads text/image/video. These are unit-tested primitives, not an active account connection.

## Development setup

1. Copy `.env.example` to a private `.env`. Keep `AUTH_MODE=local-demo` for local development only and `SOCIAL_CONNECTOR_MODE=mock`.
2. `pnpm install`
3. `pnpm db:generate`
4. `pnpm dev`
5. Web: http://localhost:3000. API: http://localhost:3001/v1/health.

PostgreSQL/Redis schema and infrastructure are retained for the next implementation phase: `docker compose up -d postgres redis`. Current draft workflows do not use these services; memory resets on API restart. No schedule worker runs. Production login UI is not wired, so production API writes fail closed.

For tests, set DATABASE_URL to a development PostgreSQL URL so Prisma can validate the schema. Run `pnpm check`, then `pnpm --filter @sma/web test:e2e`. Browser E2E runs on port 3100. Rendering tool has its own dependencies and installation under tools/news-report.

## Production work remaining

Prisma-backed content/approval/job persistence, database memberships, production login, durable scheduling worker, social OAuth callbacks and account selection, encrypted token refresh/revocation, media hosting and platform analytics. Do not enable live publication before these are implemented and tested. Setting SOCIAL_CONNECTOR_MODE=live currently returns an explicit unavailable error rather than falling back to mock.

Estimated AI usage is process-local and checked before generation; it is not a durable, concurrency-safe billing cap. No AI API key means demo text only, clearly marked for editing.

See docs/BUSINESS_CREATOR_REVIEW.md for findings and workflow, docs/META_INTEGRATION_OPTIONS.md for API/MCP and self-hosted options, and docs/META_SOCIAL_SETUP.md for account prerequisites.

## Phone testing app

A private iPhone-compatible web-app preview reuses the web UI and adds bottom navigation, adaptive icons, safe-area spacing and device-local sample workflows. Build/package instructions are in [tools/mobile-preview/README.md](tools/mobile-preview/README.md).

Phone preview: https://orbit-mobile-albab-preview.airy-kiwi-2012.chatgpt.site

This build uses browser-local test data, no AI API calls and no live social connections. Add it to the Home Screen from Safari. It is a portable web app, not a signed IPA or APK; video export remains render-settings JSON. Physical iPhone visual/playback verification remains a user testing step.
