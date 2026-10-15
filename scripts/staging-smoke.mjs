// Runs only against disposable local PostgreSQL, using generated test identities.
// This is an acceptance test of compiled processes, not a cloud deployment tool.
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

if (process.env.ORBIT_STAGING_SMOKE !== "true")
  throw Error("Explicit disposable staging smoke opt-in required");
const database = new URL(process.env.DATABASE_URL ?? "");
if (!["localhost", "127.0.0.1", "[::1]"].includes(database.hostname))
  throw Error("Smoke test requires disposable local PostgreSQL");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requireApi = createRequire(path.join(root, "apps/api/package.json"));
const { PrismaClient } = requireApi("@sma/database");
const { SignJWT } = requireApi("jose");
const db = new PrismaClient();
const mediaRoot = await mkdtemp(path.join(tmpdir(), "orbit-http-acceptance-"));
const secret = randomBytes(48).toString("base64url");
const port = 3299;
const origin = `http://127.0.0.1:${port}`;
const issuer = "https://orbit-acceptance.invalid";
const subjects = [`smoke-${randomUUID()}`, `smoke-${randomUUID()}`];
const organizations = [];
const children = new Set();
let api;
let worker;

function launch(entry, cwd, extra) {
  const child = spawn(process.execPath, [path.join(root, entry)], {
    cwd: path.join(root, cwd),
    stdio: "ignore",
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      DATABASE_URL: process.env.DATABASE_URL,
      NODE_ENV: "production",
      MEDIA_ROOT: mediaRoot,
      MEDIA_RENDER_ENABLED: "true",
      ...extra,
    },
  });
  children.add(child);
  return child;
}
async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    delay(5000),
  ]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await new Promise((resolve) => child.once("exit", resolve));
  }
}
async function startApi() {
  api = launch("apps/api/dist/apps/api/src/main.js", "apps/api", {
    PORT: String(port),
    WEB_URL: "https://orbit-acceptance.invalid",
    DEV_AUTH_ENABLED: "false",
    AUTH_JWT_ISSUER: issuer,
    AUTH_JWT_AUDIENCE: "authenticated",
    AUTH_JWT_SECRET: secret,
  });
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (api.exitCode !== null || api.signalCode !== null)
      throw Error("Compiled API exited before readiness");
    try {
      if (
        (
          await fetch(`${origin}/v1/ready`, {
            signal: AbortSignal.timeout(1000),
          })
        ).ok
      )
        return;
    } catch {}
    await delay(250);
  }
  throw Error("Compiled API readiness timed out");
}
async function token(sub) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuer(issuer)
    .setAudience("authenticated")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(secret));
}
async function request(
  route,
  { jwt, workspace, body, method = "GET", binary = false } = {},
) {
  const headers = {};
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  if (workspace) headers["x-workspace-id"] = workspace;
  if (body !== undefined)
    headers["Content-Type"] = binary ? "video/mp4" : "application/json";
  return fetch(`${origin}/v1${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : binary ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
}
async function jsonOk(route, options) {
  const response = await request(route, options);
  assert.ok(response.ok, `HTTP ${response.status} at ${route}`);
  return response.json();
}
try {
  await db.$connect();
  await startApi();
  assert.equal((await request("/workspaces")).status, 401);
  assert.equal((await request("/workspaces", { jwt: "invalid" })).status, 401);
  const [a, b] = await Promise.all(subjects.map(token));
  const one = await jsonOk("/workspaces", {
    jwt: a,
    method: "POST",
    body: { name: "HTTP acceptance A" },
  });
  const two = await jsonOk("/workspaces", {
    jwt: b,
    method: "POST",
    body: { name: "HTTP acceptance B" },
  });
  for (const id of [one.id, two.id])
    organizations.push(
      (await db.workspace.findUniqueOrThrow({ where: { id } })).organizationId,
    );
  assert.equal(
    (await request("/content", { jwt: b, workspace: one.id })).status,
    403,
  );
  console.log(
    "PASS compiled API verifies identity and denies cross-workspace access",
  );

  const fixture = path.join(mediaRoot, "source.mp4");
  execFileSync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=blue:s=160x120:r=30",
      "-t",
      "1",
      "-threads",
      "1",
      "-pix_fmt",
      "yuv420p",
      fixture,
    ],
    { stdio: "ignore" },
  );
  const input = await readFile(fixture);
  const asset = await jsonOk("/media/assets", {
    jwt: a,
    workspace: one.id,
    method: "POST",
    binary: true,
    body: input,
  });
  assert.equal(asset.bytes, input.length);
  const settings = {
    assetId: asset.id,
    start: 0,
    duration: 0.5,
    format: "portrait",
    news: { title: "Pemandangan Kuala Lumpur", date: "16 Oktober 2026" },
  };
  assert.equal(
    (
      await request("/media/renders", {
        jwt: b,
        workspace: two.id,
        method: "POST",
        body: settings,
      })
    ).status,
    404,
  );
  const job = await jsonOk("/media/renders", {
    jwt: a,
    workspace: one.id,
    method: "POST",
    body: settings,
  });
  assert.equal(job.status, "QUEUED");
  assert.equal(
    (
      await request(`/media/renders/${job.id}/download`, {
        jwt: a,
        workspace: one.id,
      })
    ).status,
    409,
  );
  const cancelled = await jsonOk("/media/renders", {
    jwt: a,
    workspace: one.id,
    method: "POST",
    body: settings,
  });
  assert.equal(
    (
      await jsonOk(`/media/renders/${cancelled.id}/cancel`, {
        jwt: a,
        workspace: one.id,
        method: "POST",
        body: {},
      })
    ).status,
    "CANCELLED",
  );

  await stop(api);
  await startApi();
  const afterRestart = await jsonOk("/media/renders", {
    jwt: a,
    workspace: one.id,
  });
  assert.equal(afterRestart.find((row) => row.id === job.id)?.status, "QUEUED");
  console.log(
    "PASS raw HTTP upload, cancellation and queued jobs survive API restart",
  );

  worker = launch("apps/media-worker/dist/index.js", "apps/media-worker", {});
  const deadline = Date.now() + 45000;
  let result;
  while (Date.now() < deadline) {
    if (worker.exitCode !== null || worker.signalCode !== null)
      throw Error("Compiled worker exited");
    result = (
      await jsonOk("/media/renders", { jwt: a, workspace: one.id })
    ).find((row) => row.id === job.id);
    if (result?.status === "SUCCEEDED") break;
    if (result?.status === "FAILED") throw Error("Real worker render failed");
    await delay(500);
  }
  assert.equal(result?.status, "SUCCEEDED", "Real render did not finish");
  assert.equal(
    (await request(`/media/renders/${job.id}/download`)).status,
    401,
  );
  assert.equal(
    (
      await request(`/media/renders/${job.id}/download`, {
        jwt: b,
        workspace: two.id,
      })
    ).status,
    404,
  );
  const response = await request(`/media/renders/${job.id}/download`, {
    jwt: a,
    workspace: one.id,
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^video\/mp4/);
  const output = path.join(mediaRoot, "download.mp4");
  await writeFile(output, Buffer.from(await response.arrayBuffer()));
  const probe = JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "stream=codec_name,width,height",
        "-of",
        "json",
        output,
      ],
      { encoding: "utf8" },
    ),
  );
  assert.ok(
    probe.streams.some(
      (stream) =>
        stream.codec_name === "h264" &&
        stream.width === 720 &&
        stream.height === 1280,
    ),
  );
  console.log(
    "PASS compiled worker renders real H.264 MP4 and download remains private",
  );
} finally {
  await Promise.all([...children].map(stop));
  try {
    await db.organization.deleteMany({ where: { id: { in: organizations } } });
    await db.user.deleteMany({ where: { authUserId: { in: subjects } } });
  } finally {
    await db.$disconnect();
    await rm(mediaRoot, { recursive: true, force: true });
  }
}
