# Orbit business and creator workflow

Reviewed 14 October 2026. This branch replaces the fixed 4Life campaign demo with a configurable business or creator workspace. Existing optional shop/legal routes remain available but are no longer injected into general content.

## Source findings and changes

| Before | Now |
| --- | --- |
| Fixed wellness brand, audience, CTA and product prompt | Editable business/creator profile, language, audience, voice and topics; azhari_101kerja starter profile |
| Saving edits immediately approved content | Save produces a new draft revision; separate actor-stamped approval required |
| Draft could be scheduled or published | Current approved revision and valid future schedule required; future jobs cannot be simulated early |
| Mock returned PUBLISHED and fake public link | Mock returns SIMULATED, with no publication URL or timestamp |
| Guard declared but inactive | Guard mounted; explicit local demo opt-in, otherwise signed workspace and role claims |
| New AI store on each generation request | Store retained for the API lifetime, with per-workspace estimated monthly totals |
| Static calendar and analytics metrics | Calendar reads actual in-memory records; fabricated metrics removed |
| Decorative video storyboard and inactive export button | Local clip preview, configurable News report overlay, render-settings export and standalone Remotion renderer |
| Only mock connectors | Server-only low-level Meta publishing adapters added, tested with fake transport; intentionally not registered for live publishing |

## Current limits

This is a review-first development workflow, not a deployed business publishing service. Brand/content/approval/schedule records and estimated AI usage are process-local; API restart clears them. Schedule records do not execute automatically. Browser profile preferences are stored locally. Production login UI, Prisma-backed memberships and content, queue workers, asset hosting, social OAuth callbacks/account discovery, token refresh/revocation and analytics remain required.

`AUTH_MODE=local-demo` must only be used locally. It grants local developer/owner access to a caller-supplied workspace header and is disabled in production. Signed authentication requires SUPABASE_JWT_SECRET, SUPABASE_JWT_ISSUER and SUPABASE_JWT_AUDIENCE. Production API calls require HS256 signed JWTs with verified issuer/audience plus `sub`, `exp`, and administrator-owned `app_metadata.workspace_ids` and `workspace_role` (owner/admin/editor/approver/viewer). This temporary role applies across authorized workspaces; replace it with database membership resolution before multi-tenant deployment. The web currently sends a demo workspace header and has no login/token acquisition flow, so production writes correctly fail closed.

AI spend is estimated with the existing model rate table and is not a durable, concurrency-safe billing cap. Current prices must be rechecked before production. No paid AI calls were made during validation.

## Review-first operation

1. Set business/creator settings in Brand Settings.
2. Generate or edit Facebook, Instagram and Threads drafts.
3. Save edits, then explicitly approve the exact revision.
4. Record a future schedule in Malaysia time. The API stores UTC ISO timestamps.
5. Optional simulation is available for unscheduled approved content or a due schedule; it never posts to Meta.
6. Implement and verify live connections and durable jobs before enabling automated publication. Any future agent/MCP caller must use these workflow rules, never an unrestricted direct publishing credential.

Jobs must persist account IDs, approved revision, container IDs, attempt state and confirmed external post IDs. Uncertain network outcomes require reconciliation before retry. Never retry an entire cross-platform batch when one channel has already succeeded.

## Verification

Run `pnpm check` with a development DATABASE_URL set (Prisma validation requires the variable but does not connect for schema validation). Run `pnpm --filter @sma/web test:e2e` for owner review, failure handling and business profile browser checks. API tests cover draft gating, stale revisions, approval invalidation, cross-workspace reads, schedule validation, due-time/concurrency simulation and auth roles. Adapter tests use mocked transports only; they do not prove Meta App Review, tokens or accounts are ready.

## Validation completed on this branch

- `pnpm check` passed: lint/typecheck, Prisma schema validation, 38 unit tests and builds across the workspace.
- 4 Playwright browser tests passed: save/approve/schedule revision handling, failed approval reporting, profile persistence and video settings export with actual clip duration.
- The standalone News report composition bundled and rendered a still from a generated test clip; title, date and transparency were visually checked.
- Actual Nest HTTP checks covered auth failure, draft/revision gating, future schedules, simulation and live-mode rejection.

Environment-only browser validation used an installed Chromium executable and a local OS network-interface compatibility shim; neither is added to the project. No live account publishing, paid AI calls, production deployment or database migration was performed.
