# Private media staging flow

This delivery connects upload → PostgreSQL queue → isolated worker → authenticated MP4 download. It is an operator-configured alpha, not a public media service deployment.

## Responsibilities

| File | Purpose |
| --- | --- |
| `apps/api/src/media.controller.ts` | Small authenticated HTTP routes |
| `apps/api/src/media.service.ts` | Workspace authorization, upload reservations, durable jobs, download |
| `apps/api/src/media-storage.ts` | Private filenames, streaming limits, magic-byte checks |
| `apps/media-worker/src/store.ts` | PostgreSQL claim and lease-token transitions |
| `apps/media-worker/src/index.ts` | One-worker loop and shutdown |
| `packages/media/src/worker.ts` | Ownership, cancellation and renderer orchestration |
| `packages/media/src/index.ts` | FFmpeg probe, render and output validation |
| `apps/web/app/orbit/video-editor.tsx` | Phone/web preview and real job controls |

## Setup

1. Apply `pnpm db:migrate` to a staging database after reviewing the migration. The new migration adds durable jobs and workspace media allowances.
2. Create a private absolute `MEDIA_ROOT` directory outside web/public directories. Only trusted API and worker users may write it. Mount the same private volume into API and worker at the same canonical absolute path. Do not mount user-controlled filesystem directories.
3. Install FFmpeg/FFprobe with libx264/AAC/drawtext and a suitable font in the worker environment. Use enforced OS/container CPU, memory, disk and process limits. Deny networking to codec processes while allowing the worker's database connection. The application does not provision these controls.
4. Set server `MEDIA_ROOT` and `MEDIA_RENDER_ENABLED=true` only after the isolated worker environment is ready. Leave the flag false for public environments until that requirement is met. Never expose these variables via `NEXT_PUBLIC_*`.
5. Build the monorepo, start the API, then run `pnpm --filter @sma/media-worker start` as the isolated worker service. It loads private root `.env` for local operator use, or uses platform-provided environment variables.
6. In Orbit choose Media → Video → choose file → Upload to workspace → configure trim/template/captions → Render MP4. Jobs remain queued until a worker runs. Download requires the same authenticated workspace membership.

## API

All routes require a verified JWT and `x-workspace-id` membership. Writing requires OWNER, ADMIN or EDITOR.

| Method | Route under `/v1` | Behaviour |
| --- | --- | --- |
| GET | `/media/status` | Configuration and limits; does not claim worker health |
| POST | `/media/assets` | Raw MP4/MOV/WebM bytes, exact `Content-Type` and `Content-Length` |
| POST | `/media/renders` | Asset ID and validated settings; queues a durable job |
| GET | `/media/renders` | Last 50 jobs in the current workspace |
| POST | `/media/renders/:id/cancel` | Cancels queued/processing work; worker observes within two seconds |
| GET | `/media/renders/:id/download` | Private no-store MP4 stream after success |

No API accepts filesystem paths, executable names, arbitrary URLs or FFmpeg arguments. Upload magic checks identify supported containers; they are not antivirus or a full decoder validation. Full probing happens inside the isolated renderer.

## Alpha allowances and failure behaviour

- Each upload: 100 MiB, streamed to an exclusive private file. Declared and observed byte counts must match. Workspace input storage cap: 1 GiB, reserved atomically before streaming. Duplicate bytes in one workspace reuse an existing asset and refund the second reservation.
- Each workspace initially receives 50 lifetime render slots. Slots are consumed when a valid owned-asset job is queued; failed or cancelled jobs are not refunded. These are staging safeguards, not subscription plans or monthly billing credits. Outputs are each capped at 64 MiB.
- Output duration: 0.1–120 seconds. Caption text: 120 characters, maximum 100 captions at API boundary (UI offers 20). News title/date: 100/40 characters. Supported ratios: portrait 720×1280, square 1080×1080, landscape 1280×720.
- One worker processes one job at a time. Ten minute leases exceed the five minute codec timeout; interrupted jobs recover after expiry, at most three interrupted attempts. Decode/validation failures fail immediately. Cancellation and old worker completions cannot override a newer lease.
- Ambiguous database replies preserve private bytes and reservations rather than deleting a potentially committed asset/export. There can be orphan files or held reservations after interruption. Retention, orphan reconciliation, deletion and operator quota adjustment still need a reviewed production implementation.
- Keep persistent storage and database backups consistent. Local-volume alpha is not suitable for stateless serverless instances. Object storage adapters and production operational monitoring remain separate release tasks.

## Verification

Focused tests cover authorization/ownership, upload rejection and refund, deduplication, ambiguous commits, unsafe paths, cancellation and stale leases. PostgreSQL CI integration uses the actual SQL claim/recovery and authenticated download service with fixture output. The independent media suite exercises a real FFmpeg render locally when the codec is available. No real phone acceptance or deployed worker is assumed.
