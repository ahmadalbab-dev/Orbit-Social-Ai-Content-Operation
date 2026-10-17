import { createHash } from "node:crypto";
import { mkdir, realpath, rm } from "node:fs/promises";
import path from "node:path";
import { renderVideo, validateRenderJob } from "./index.js";

export interface ClaimedRender {
  id: string;
  workspaceId: string;
  assetId: string;
  leaseToken: string;
  options: unknown;
}
export interface RenderAsset {
  workspaceId: string;
  storageProvider: string;
  storageKey: string;
  mimeType: string;
}
/** Database operations are deliberately small so lease and cancellation behavior can be tested. */
export interface RenderStore {
  claim(): Promise<ClaimedRender | null>;
  asset(id: string): Promise<RenderAsset | null>;
  stillOwned(job: ClaimedRender): Promise<boolean>;
  complete(job: ClaimedRender, outputKey: string): Promise<boolean>;
  fail(job: ClaimedRender, errorCode: string): Promise<void>;
}
export function workspaceDirectory(root: string, workspaceId: string): string {
  if (!path.isAbsolute(root)) throw new Error("MEDIA_ROOT must be absolute");
  return path.join(
    root,
    createHash("sha256").update(workspaceId).digest("hex"),
  );
}
function inside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}
async function privateWorkspace(
  root: string,
  workspaceId: string,
): Promise<string> {
  const canonicalRoot = await realpath(root);
  const expected = workspaceDirectory(canonicalRoot, workspaceId);
  const workspace = await realpath(expected);
  if (workspace !== expected || !inside(canonicalRoot, workspace))
    throw new Error("Invalid storage directory");
  await mkdir(path.join(workspace, "exports"), {
    recursive: true,
    mode: 0o700,
  });
  if (
    (await realpath(path.join(workspace, "exports"))) !==
    path.join(workspace, "exports")
  )
    throw new Error("Invalid export directory");
  return workspace;
}
type Renderer = typeof renderVideo;
/** One durable job. A lost lease never overwrites a newer worker's result. */
export async function processOneRender(
  store: RenderStore,
  root: string,
  options: {
    signal?: AbortSignal;
    renderer?: Renderer;
    cancellationPollMs?: number;
  } = {},
): Promise<boolean> {
  options.signal?.throwIfAborted();
  const job = await store.claim();
  if (!job) return false;
  const controller = new AbortController();
  const stop = () => controller.abort();
  options.signal?.addEventListener("abort", stop, { once: true });
  if (options.signal?.aborted) stop();
  let databaseUnavailable = false;
  let lostLease = false;
  let directory: string | undefined;
  let output: string | undefined;
  let committed = false;
  let polling: Promise<void> | undefined;
  // One in-flight poll at a time; connection errors abort codec work and leave the lease recoverable.
  const timer = setInterval(() => {
    if (polling) return;
    polling = store
      .stillOwned(job)
      .then((owned) => {
        if (!owned) {
          lostLease = true;
          controller.abort();
        }
      })
      .catch(() => {
        databaseUnavailable = true;
        controller.abort();
      })
      .finally(() => {
        polling = undefined;
      });
  }, options.cancellationPollMs ?? 2000);
  try {
    const asset = await store.asset(job.assetId).catch(() => {
      databaseUnavailable = true;
      throw new Error("Database unavailable");
    });
    if (
      !asset ||
      asset.workspaceId !== job.workspaceId ||
      asset.storageProvider !== "local-private" ||
      !/^uploads\/[0-9a-f-]{36}\.(mp4|mov|webm)$/.test(asset.storageKey) ||
      !["video/mp4", "video/quicktime", "video/webm"].includes(
        asset.mimeType,
      ) ||
      !/^[0-9a-f-]{36}$/.test(job.id) ||
      !/^[0-9a-f-]{36}$/.test(job.leaseToken)
    )
      throw new Error("Invalid media asset");
    directory = await privateWorkspace(root, job.workspaceId);
    output = `exports/${job.id}-${job.leaseToken}.mp4`;
    const inputOptions =
      job.options &&
      typeof job.options === "object" &&
      !Array.isArray(job.options)
        ? (job.options as Record<string, unknown>)
        : {};
    // Never allow stored/request data to select executable paths, input paths, or output paths.
    const render = validateRenderJob({
      start: inputOptions.start,
      duration: inputOptions.duration,
      format: inputOptions.format,
      news: inputOptions.news,
      captions: inputOptions.captions,
      input: asset.storageKey,
      output,
    });
    await (options.renderer ?? renderVideo)(render, directory, {
      signal: controller.signal,
      timeoutMs: 300000,
    });
    controller.signal.throwIfAborted();
    committed = await store.complete(job, output).catch(() => {
      databaseUnavailable = true;
      throw new Error("Database unavailable");
    });
  } catch {
    if (!options.signal?.aborted && !databaseUnavailable && !lostLease) {
      await store.fail(job, "RENDER_FAILED");
    }
  } finally {
    clearInterval(timer);
    options.signal?.removeEventListener("abort", stop);
    await polling;
    // Preserve files after ambiguous database errors: a successful commit may have lost its reply.
    // Other cancelled or stale attempts can be removed safely.
    if (!committed && !databaseUnavailable && directory && output)
      await rm(path.join(directory, output), { force: true });
  }
  return true;
}
