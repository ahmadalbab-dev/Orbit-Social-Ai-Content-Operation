# Private media worker

Run `pnpm --filter @sma/media-worker start` after building dependencies and applying database migrations. Configure `DATABASE_URL`, an absolute `MEDIA_ROOT`, and explicitly set `MEDIA_RENDER_ENABLED=true`. The API and worker must share that private volume. Uploads and exports are not public web directories.

The worker claims one PostgreSQL job at a time, holds a ten minute lease, and limits the renderer to five minutes. It checks cancellation every two seconds and uses a lease token to reject stale completion. Interrupted work is recovered after lease expiry, up to three attempts. Errors contain fixed codes rather than codec output, credentials, or file paths.

For staging and production, use a separate worker container/user with FFmpeg and FFprobe installed, codec process network access disabled, and enforced CPU, memory, disk and process limits. The API never runs FFmpeg. The worker needs database connectivity; disable network for codec subprocesses with container/OS isolation rather than removing the worker's database connection. This package does not provision that isolation or deploy a public render service.
