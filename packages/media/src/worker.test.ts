import { randomUUID } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  rm,
  writeFile,
  access,
  symlink,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  processOneRender,
  workspaceDirectory,
  type ClaimedRender,
  type RenderStore,
} from "./worker.js";
import type { RenderJob } from "./index.js";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "orbit-worker-test-"));
  roots.push(root);
  const directory = workspaceDirectory(root, "workspace-one");
  await mkdir(path.join(directory, "uploads"), { recursive: true });
  const job: ClaimedRender = {
    id: randomUUID(),
    workspaceId: "workspace-one",
    assetId: randomUUID(),
    leaseToken: randomUUID(),
    options: { duration: 1, format: "portrait" },
  };
  const store: RenderStore = {
    claim: vi.fn().mockResolvedValue(job),
    asset: vi
      .fn()
      .mockResolvedValue({
        workspaceId: job.workspaceId,
        storageProvider: "local-private",
        storageKey: `uploads/${randomUUID()}.mp4`,
        mimeType: "video/mp4",
      }),
    stillOwned: vi.fn().mockResolvedValue(true),
    complete: vi.fn().mockResolvedValue(true),
    fail: vi.fn().mockResolvedValue(undefined),
  };
  const renderer = vi.fn(async (value: unknown) => {
    const render = value as RenderJob;
    await writeFile(path.join(directory, render.output), "test-video");
    return { output: render.output, duration: 1, width: 720, height: 1280 };
  });
  return { root, directory, job, store, renderer };
}
describe("durable media worker", () => {
  it("uses only generated paths and stores the matching lease completion", async () => {
    const f = await fixture();
    f.job.options = {
      duration: 1,
      format: "portrait",
      output: "/arbitrary",
      input: "/arbitrary",
      ffmpegPath: "bad",
    };
    expect(
      await processOneRender(f.store, f.root, { renderer: f.renderer }),
    ).toBe(true);
    expect(f.store.complete).toHaveBeenCalledWith(
      f.job,
      `exports/${f.job.id}-${f.job.leaseToken}.mp4`,
    );
    expect(f.renderer.mock.calls[0][0]).not.toHaveProperty("ffmpegPath");
  });
  it("rejects cross-workspace asset references before invoking the renderer", async () => {
    const f = await fixture();
    vi.mocked(f.store.asset).mockResolvedValue({
      workspaceId: "another-workspace",
      storageProvider: "local-private",
      storageKey: `uploads/${randomUUID()}.mp4`,
      mimeType: "video/mp4",
    });
    await processOneRender(f.store, f.root, { renderer: f.renderer });
    expect(f.renderer).not.toHaveBeenCalled();
    expect(f.store.fail).toHaveBeenCalledWith(f.job, "RENDER_FAILED");
  });
  it("removes a stale completion after another worker or cancellation wins", async () => {
    const f = await fixture();
    vi.mocked(f.store.complete).mockResolvedValue(false);
    await processOneRender(f.store, f.root, { renderer: f.renderer });
    await expect(
      access(
        path.join(f.directory, `exports/${f.job.id}-${f.job.leaseToken}.mp4`),
      ),
    ).rejects.toThrow();
    expect(f.store.fail).not.toHaveBeenCalled();
  });
  it("aborts rendering on cancellation without replacing the cancelled status", async () => {
    const f = await fixture();
    vi.mocked(f.store.stillOwned).mockResolvedValue(false);
    const renderer = vi.fn(
      async (
        _value: unknown,
        _root: string,
        options?: { signal?: AbortSignal },
      ) => {
        await new Promise<void>((_resolve, reject) => {
          options?.signal?.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            { once: true },
          );
        });
        return { output: "", duration: 1, width: 720, height: 1280 };
      },
    );
    await processOneRender(f.store, f.root, {
      renderer,
      cancellationPollMs: 5,
    });
    expect(f.store.complete).not.toHaveBeenCalled();
    expect(f.store.fail).not.toHaveBeenCalled();
  });
  it("rejects a workspace symlink even when its target is inside the shared root", async () => {
    const f = await fixture();
    await rm(f.directory, { recursive: true });
    const other = workspaceDirectory(f.root, "another-workspace");
    await mkdir(other);
    await symlink(other, f.directory);
    await processOneRender(f.store, f.root, { renderer: f.renderer });
    expect(f.renderer).not.toHaveBeenCalled();
  });
  it("preserves an export when a commit reply is lost", async () => {
    const f = await fixture();
    vi.mocked(f.store.complete).mockRejectedValue(new Error("lost reply"));
    await processOneRender(f.store, f.root, { renderer: f.renderer });
    await expect(
      access(
        path.join(f.directory, `exports/${f.job.id}-${f.job.leaseToken}.mp4`),
      ),
    ).resolves.toBeUndefined();
    expect(f.store.fail).not.toHaveBeenCalled();
  });
});
