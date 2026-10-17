# Orbit private staging

This kit runs the commercial GitHub app on a Docker host. It does not change the existing Sites preview, copy its OAuth credentials, provision hosting, or enable real social publishing. Docker Engine with Compose v2 is required.

## Configure and start

From the repository root:

```sh
cp deploy/staging/.env.example deploy/staging/.env
chmod 600 deploy/staging/.env
```

Production images reject HTTP/localhost browser destinations. Set `WEB_URL` to the exact HTTPS web origin served by your TLS proxy, and `NEXT_PUBLIC_API_URL` to the real HTTPS API origin. Leave the public API empty for design-only testing; authenticated browser requests then fail closed. The example `.invalid` web origin is a disposable CI placeholder, not a working endpoint.

Edit that file. Replace the database password with a random hexadecimal value, and configure the trusted identity issuer and HTTPS JWKS URL. For Supabase asymmetric JWT signing keys, the example URL shapes apply. Use only the project's public publishable/anon key for the web app. Never put an App Secret, HF token, service-role key, or JWT signing secret in a `NEXT_PUBLIC_*` value. Use a dedicated private staging database, not an exposed Supabase Data API schema.

After the real ingress is known, set `TRUSTED_PROXY_IPS` only to its literal IP address(es) and restrict direct origin access. Leave it empty otherwise; never trust arbitrary forwarded headers. Without trusted proxy configuration, staging clients behind the same proxy share a rate-limit bucket. A shared limiter and edge controls are still needed before public multi-instance hosting.

All commands below must use the same env file and Compose file:

```sh
# Validate without printing resolved credentials.
docker compose --env-file deploy/staging/.env -f deploy/staging/compose.yml config --quiet
# Images receive source code and public browser configuration, never the env file.
docker compose --env-file deploy/staging/.env -f deploy/staging/compose.yml --profile render build
# Initialize only the new named media volume, then start the private database.
docker compose --env-file deploy/staging/.env -f deploy/staging/compose.yml run --rm media-init
docker compose --env-file deploy/staging/.env -f deploy/staging/compose.yml up -d postgres
# Apply reviewed migrations explicitly before application startup.
docker compose --env-file deploy/staging/.env -f deploy/staging/compose.yml run --rm migrate
docker compose --env-file deploy/staging/.env -f deploy/staging/compose.yml up -d api web
```

The loopback services remain available at `http://localhost:3000` and `http://localhost:3001` for local health checks; `/v1/ready` must report a connected database. For sign-in and authenticated browser requests, open the configured HTTPS web origin through your TLS proxy. Sign in with the configured identity provider, create a workspace, and save a draft before testing AI. Missing HF credentials leave AI generation unavailable. Never use `docker compose config` without `--quiet` in shared logs because resolved runtime credentials can be displayed.

The migration command is for a fresh database or one already tracked by this repository's Prisma migrations. An existing database with tables but no migration history needs a separate reviewed baseline plan. Do not run schema reset or `db push` on persisted staging data.

## Trusted-fixture MP4 test

Leave `MEDIA_RENDER_ENABLED=false` for normal staging. The worker profile is not started by `up -d api web`. To exercise a known, trusted video fixture in a private test environment, set `MEDIA_RENDER_ENABLED=true`, recreate the API, and start the worker explicitly:

```sh
docker compose --env-file deploy/staging/.env -f deploy/staging/compose.yml up -d api
docker compose --env-file deploy/staging/.env -f deploy/staging/compose.yml --profile render up -d media-worker
```

Upload the trusted fixture in the app, request a short render, wait for completion, and download the MP4. Test cancellation and a second workspace's denied access. Restore the flag to `false`, recreate the API, and stop the worker when finished:

```sh
docker compose --env-file deploy/staging/.env -f deploy/staging/compose.yml stop media-worker
docker compose --env-file deploy/staging/.env -f deploy/staging/compose.yml up -d api
```

Do not enable arbitrary customer uploads with this kit alone. The worker has no internet route and receives only the database URL, media path, and render flag. API and worker run as UID/GID 1000, share a private named media volume, use a read-only root filesystem and temporary `/tmp`, drop capabilities, and have resource limits. The one-time volume initializer runs as root with only `CHOWN` and `FOWNER` to set volume ownership and permissions; it cannot access the network.

These controls are **not a complete codec sandbox**. FFmpeg runs inside the same worker container and can access that worker's database credential and every workspace directory on the shared media volume. Public untrusted media requires stronger per-job codec isolation, storage and database credential separation, and an operational security review. The database container uses the official PostgreSQL image's startup permissions and a persistent data volume; it is not covered by the application read-only-root setting.

## Phone testing and operations

Ports bind only to `127.0.0.1`. A phone cannot use the Docker host's `localhost`. A chosen host/domain, TLS reverse proxy, public browser API URL, matching CORS origin, and identity redirect settings are still needed for Safari testing. Do not broaden port bindings as a substitute. Changing a `NEXT_PUBLIC_*` value requires rebuilding and recreating web; runtime environment changes alone do not update browser JavaScript.

Source secrets and key files are excluded by the root `.dockerignore`. API/worker images retain workspace dependencies and Prisma CLI for a straightforward reproducible staging build; they are not size-optimized release images. The API image intentionally has no FFmpeg. No database or worker port is published.

Use `docker compose ... logs --tail=100 api media-worker` for operational errors, but never post credentials or raw authorization URLs. Back up both named volumes before migrations or image changes. `down` preserves named volumes; **`down -v` destroys staging data and media**. Database password changes in the env file do not rotate the password inside an existing PostgreSQL volume. Coordinate rotation explicitly.

Images and commands must be validated on a Docker-capable host. Do not mark Safari, container runtime, AI-provider, or hosted staging checks complete based only on source review or a successful application build.
