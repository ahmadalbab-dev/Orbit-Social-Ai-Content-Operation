# Project and asset foundation: first delivery

## Scope

Owner requested the project/asset stage first and supplied Transitions.dev and Libraries.dev as UI/motion sources. This implementation adds a working device library at `/projects` and `/preview/projects`: create a project, import original image/video/audio files, reopen after refresh, preview, filter, deduplicate, open image/video sources in existing editors, and delete the project with its source records. Studio and Media link to the library.

This is deliberately device storage, labelled in the product. It is not Supabase project persistence, an account workspace, full composition autosave, storyboard orchestration or cloud publishing. Server ContentItem/ContentRevision/MediaAsset IDs remain separate. Editor edits still need export; refreshing the editor reloads the original source. Clearing browser site data removes the library.

## Data contract

`project-document.ts`: schemaVersion 1, project UUID, title, revision and timestamps, plus asset UUID/name/kind/MIME/byte count/SHA-256. Runtime object URLs and secrets are not stored. IndexedDB stores source byte records separately under `[projectId, assetId]`. Manifest and byte-record changes commit atomically. Read-modify-write in one transaction rejects a stale revision from another tab. Duplicate source bytes do not advance revision. Project deletion removes associated blobs in the same transaction.

Bounds: 100 projects, 100 assets/project, 512 MiB/project, 256 MiB/file and 8 MiB/image. SVG/HTML are excluded. These are device-library limits, not server upload permissions. Existing editors still perform their own decode/pixel/duration validation. Storage failure must not be presented as successful saving.

## Branding

`thinking-orbs` is pinned to 0.3.2 with registry integrity in pnpm-lock.yaml. `OrbitMark` wraps `<ThinkingOrb state="connecting" size={64}/>`; it follows theme and device motion preferences. The state is decorative brand identity and does not claim an OAuth/network connection. Header/profile/setup/editor marks share it.

Hero uses the same package's pure `thinking-orbs/engine` geometry at native canvas resolution, so a large mark does not upscale a 64px bitmap. The old ring geometry is removed. The bottom-to-top title handoff and Ponytail code field remain. Hero wordmark is `orbit.` in the existing JetBrains Mono font; application wordmarks/font are unchanged. Favicon/PWA/Apple icons use a representative static connecting frame because those surfaces do not support continuous canvas motion. Regenerate with `node scripts/generate-orbit-icons.mjs` after installing dependencies.

## Source preservation and licensing

Complete public repository snapshots were cloned on DESKTOP-ALBAB to:

- `C:\Users\User\Documents\Codex\2026-10-24\ui-motion-sources\Libraries.dev` at `b0e5a8f1e659ac549e6035e42a750e73678ed67a`
- `C:\Users\User\Documents\Codex\2026-10-24\ui-motion-sources\transitions.dev` at `54fbee8e9d698598b4e7ceabb2fb43ea30beacfc`

These are public source snapshots, not authenticated Pro downloads. No subscription, remote motion agent, hosted AI fix service or globally installed skill was activated. The source skills were read as implementation guidance. Owner's explicit requested brand usage overrides their default advice to use Orbs only as loading indicators.

Project media tabs and preview panels use the public Transitions.dev CSS recipes (16-tabs-sliding and 07-panel-reveal) with required reduced-motion guards, plus Orbit's device pause override. Card colours/layout use Orbit's existing tokens. Retain license notices in docs/licenses. Do not redistribute the source collection as an animation-kit product.

References:

- https://libraries.dev/orbs
- https://github.com/Jakubantalik/Libraries.dev/tree/main/skills/libraries-dev
- https://github.com/Jakubantalik/Libraries.dev/tree/main/packages/thinking-orbs
- https://transitions.dev/skill.html
- https://github.com/Jakubantalik/transitions.dev/tree/main/skills/transitions-dev
- https://transitions.dev/terms.html

## Acceptance gates

Local TypeScript and production build passed during implementation; manifest and hero sequencing tests passed (11 tests). New browser cases cover source persistence/deduplication, image pixels/export, decoded video source, stale concurrent imports, deletion of blobs, mobile keyboard filters/themes and reduced-motion branding. Browser results are recorded separately after execution; this file does not claim those cases passed before they ran.

Next ordered phase: account-scoped project documents plus private storage and composition save/reload adapters; then Studio scenes and provider jobs. Preserve source UUID/provenance and draft-revision validation while adding those adapters. Existing provider acceptance and OAuth/Openverse blockers are unchanged by this delivery.

## WebKit storage compatibility

A controlled Windows WebKit probe returned `UnknownError: Error preparing Blob/File data to be stored in object store` for both Blob and File, while ArrayBuffer saved successfully. Sources are therefore stored as ArrayBuffer plus MIME metadata, preserving exact bytes. Reads still accept legacy Blob records. Browser tests keep the original persistence/export assertions; none are skipped to hide this failure.

## Recorded acceptance

- Web unit suite: 238 passed across 35 files. Web TypeScript passed. Production Next.js build passed.
- DESKTOP-ALBAB Chromium Home suite: 14 passed, including six viewport sizes, theme/ink contrast, reduced motion and the complete hero handoff.
- DESKTOP-ALBAB WebKit Home suite: 13 passed, one intentional Chromium-only recording skip.
- Six project-library cases are accepted in Chromium and WebKit after the byte-record fix (12 browser/case combinations). The final focused video control test passed in both engines; the preceding run passed the other combinations.
- Chromium decoded the untouched H.264/AAC fixture through HTTP, File URL and ArrayBuffer reconstruction (160x90, 2 seconds). Windows WebKit returned media error code 4 on all three untouched controls despite canPlayType reporting support. Its project-video case therefore verifies the explicit unsupported-codec message; it is not a successful WebKit H.264 playback/export claim. Image source pixels, image export download, source persistence/deletion and concurrency are actually checked in both browsers.
- The new test is included in the existing WebKit CI selection. GitHub CI and Vercel deployment of the pushed head remain separate checks.

Browser artifacts are in the isolated DESKTOP-ALBAB checkout under apps/web/test-results/projects-accepted and projects-codec-accepted. Earlier Home artifacts are under projects-chromium and projects-webkit. Owner's existing checkout and its untracked recovery configuration were preserved.
