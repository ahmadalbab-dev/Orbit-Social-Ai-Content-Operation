# Orbit remediation review, 14 October 2026

Scope: bounded source, dependency and CI review of the creator workflow. Not a penetration-test certificate or an exhaustive malware assessment.

## CI failure

GitHub run 38563564207 failed the production dependency audit in the quality job; lint, type checks, unit tests and builds had passed. The secret-scan job succeeded. Initial audit reported 3 critical, 8 high, 5 moderate and 1 low vulnerability.

Updated Next to 15.5.27 and scoped overrides for sharp, multer, proxy-addr, nanoid, source-map-js, deepmerge-ts and qs. Frozen-lockfile installation remains the CI contract; the security gate was not disabled. Final local production audit reported zero advisories at every severity, and the standalone video renderer production audit also reported zero.

## Remediated source findings

- Runtime validation gap and unexpected mutation fields: strict controller schemas, bounded payloads, explicit field projection and generic errors.
- Unbounded demo memory and concurrent generation: workspace/global record caps, per-workspace generation locks, post-await capacity recheck and bounded AI cache.
- Paid malformed AI response bypassing spend accounting: record known usage before parsing, never cache invalid output. Regression test proves a subsequent paid request is blocked after the budget threshold.
- Local demo network exposure: loopback default binding and loopback Compose ports. Explicit container internal binding preserves local development operation.
- UI repeatedly creating identical profiles: reuse the current profile ID for draft generation and clear stale cache after an API restart.
- Built API startup regression: explicit ESM export extension and Nest injection token; a compiled HTTP smoke check now runs in CI.

Tests cover unknown fields, workspace isolation, SQL-like text as inert data, bounds, lock release, global-capacity races, expired/evicted caches retaining spend, malformed AI response accounting and review-bound approvals. Local validation passed: lint, typecheck, 50 unit tests, full builds, Prisma schema validation and four browser tests. Both compiled Node and source startup passed actual HTTP checks: health 200, oversized JSON 413, generic unknown-field 400 and inert SQL-like text 201. Local-demo listeners bound to loopback. The built API smoke script passed and is included in CI.

## Limits

No live Meta calls, real posting or production database queries were performed. The workflow remains in memory, and there is no production OAuth connection, durable scheduler or encrypted credential store yet. Existing token-encryption utilities do not mean token lifecycle management is integrated. Signed global roles must become workspace-specific durable memberships before production. Cost estimation is process-local and cannot guarantee a distributed billing ceiling.

A formal Codex Security scan could not be initialized because its referenced scan resources were unavailable. This report records the manual source/dependency review and focused regression evidence instead. Production readiness requires the controls described in SECURITY.md and SCHEDULER_ARCHITECTURE.md.
