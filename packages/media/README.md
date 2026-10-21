# @sma/media

Actual local FFmpeg MP4 renderer for Orbit media workers. This is a worker library and operator CLI, **not a deployed render service**. It does not make AI-generated video, charge customers, upload media or enqueue jobs.

Requirements: Node 22+, FFmpeg/ffprobe with libx264, AAC and drawtext/fontconfig plus an installed font (for example DejaVu Sans). Production must use a maintained FFmpeg build in an unprivileged isolated container with CPU, memory, disk and concurrency quotas and network disabled. Use a per-tenant, worker-owned media root; untrusted users must not have filesystem access or be able to replace parent directories or media files while a job executes.

```ts
import { renderVideo } from '@sma/media';
await renderVideo({
  input: 'uploads/source.mp4', output: 'exports/news.mp4',
  start: 0, duration: 15, format: 'portrait',
  news: { title: 'Pemandangan terkini di sekitar Kuala Lumpur', date: '15 Oktober 2026' },
  captions: [{ text: 'Suasana Kuala Lumpur', start: 0, end: 3 }]
}, '/worker/tenant-media', { signal });
```

The output parent must already exist. Portrait is 720x1280, square 1080x1080 and landscape 1280x720. Dates are explicit input, not inferred from a worker timezone. News report uses a translucent red panel with date above a smaller white title. Caption times are relative to the trimmed output. Title/caption text is written to generated private text files with FFmpeg expansion disabled, not interpolated into filter syntax. Outputs are H.264/AAC MP4 with faststart. Output creation is exclusive and never overwrites an existing file.

Limits: 120 seconds per render, 512 MiB local input, source dimensions up to 4096 each, 100 captions, bounded overlay text, two codec threads, 64 MiB output cap and at most five minutes timeout. Existing movie audio is optional. Input decoding permits only local file protocol and listed movie extensions. These application limits complement container resource controls; they cannot replace codec sandboxing or malware scanning.

Run `pnpm --filter @sma/media build`, then `node packages/media/dist/cli.js MEDIA_ROOT JOB_JSON`. SIGINT/SIGTERM cancels the child process; temporary render files are removed. `ffmpegPath` and `ffprobePath` options are trusted operator settings, never request data. Logs deliberately omit raw child output. Set worker-specific font packages for broader Unicode coverage.

Backend integration still requires authenticated uploads, tenant ownership checks, job queue/state, isolated worker execution, private object storage, progress delivery, cancellation permissions and expiring download URLs. No public API should accept raw filesystem paths or FFmpeg arguments. Prefer server-generated asset IDs resolved into this worker's private root.
