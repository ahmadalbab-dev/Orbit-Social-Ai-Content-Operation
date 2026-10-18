#!/usr/bin/env bash
# Disposable CI acceptance only. Never run against an existing deployment.
set -euo pipefail
if [[ "${ORBIT_DISPOSABLE_CONTAINERS:-}" != "true" ]]; then
  echo "Explicit disposable-container test opt-in required" >&2
  exit 1
fi
project="orbit-ci-${RANDOM}-${RANDOM}"
compose=(docker compose -p "$project" --env-file deploy/staging/.env -f deploy/staging/compose.yml)
cleanup() { "${compose[@]}" down --volumes --remove-orphans >/dev/null 2>&1 || true; }
trap cleanup EXIT
"${compose[@]}" config --quiet
"${compose[@]}" build api web media-worker
"${compose[@]}" up -d --wait --wait-timeout 120 postgres
"${compose[@]}" --profile setup run --rm media-init
# Setup is repeatable and must preserve volume ownership on subsequent runs.
"${compose[@]}" --profile setup run --rm media-init
"${compose[@]}" --profile setup run --rm migrate
"${compose[@]}" up -d --wait --wait-timeout 120 api web
"${compose[@]}" --profile render run --rm --no-deps --entrypoint ffmpeg media-worker -version >/dev/null
"${compose[@]}" exec -T api sh -c 'test "$(id -u)" = 1000 && test ! -e /app/.env && test ! -e /app/deploy/staging/.env'
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
const ready=await fetch('http://127.0.0.1:3001/v1/ready');
assert.equal(ready.status,200);
assert.equal((await fetch('http://127.0.0.1:3001/v1/workspaces')).status,401);
const web=await fetch('http://127.0.0.1:3000');
assert.equal(web.status,200);
assert.match(await web.text(),/Restoring your session…/);
console.log('PASS built staging images start nonroot with private database and session restoration shell');
JS
