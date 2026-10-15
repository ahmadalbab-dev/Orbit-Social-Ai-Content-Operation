import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { MediaService } from "./media.service";
import type { DatabaseService } from "./database.service";
import { workspaceMediaRoot } from "./media-storage";

const owner = {
  sub: "test",
  userId: "user",
  workspaceId: "workspace-a",
  role: "OWNER",
};
const assetId = "9d397f92-d31f-4e6f-967a-848de710f747";
const bytes = Buffer.from("0000ftypisom-test-video");
let root: string;
function setup() {
  const workspace = { updateMany: vi.fn(async () => ({ count: 1 })) };
  const mediaAsset = {
    findUnique: vi.fn(async () => null as any),
    findFirst: vi.fn(async () => null as any),
    create: vi.fn(async ({ data }: any) => ({ ...data, id: assetId })),
  };
  const mediaRender = {
    findFirst: vi.fn(async () => null as any),
    findMany: vi.fn(async () => []),
    create: vi.fn(async ({ data }: any) => ({
      ...data,
      id: assetId,
      status: "QUEUED",
      errorCode: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    updateMany: vi.fn(async () => ({ count: 1 })),
  };
  const tx = { workspace, mediaAsset, mediaRender };
  const db = {
    ...tx,
    $transaction: async (fn: any) => fn(tx),
  } as unknown as DatabaseService;
  return { ...tx, service: new MediaService(db) };
}
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "orbit-api-media-"));
  vi.stubEnv("MEDIA_ROOT", root);
  vi.stubEnv("MEDIA_RENDER_ENABLED", "true");
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(root, { recursive: true, force: true });
});
describe("private media API", () => {
  it("rejects viewers before reserving storage", async () => {
    const { service, workspace } = setup();
    await expect(
      service.upload(
        { ...owner, role: "VIEWER" },
        Readable.from(bytes),
        "video/mp4",
        String(bytes.length),
      ),
    ).rejects.toThrow("Role cannot");
    expect(workspace.updateMany).not.toHaveBeenCalled();
  });
  it("checks observed bytes and magic and refunds rejected uploads", async () => {
    const { service, workspace } = setup();
    const invalid = Buffer.from("this is not a video");
    await expect(
      service.upload(
        owner,
        Readable.from(invalid),
        "video/mp4",
        String(invalid.length),
      ),
    ).rejects.toThrow("upload did not complete");
    expect(workspace.updateMany).toHaveBeenLastCalledWith({
      where: { id: owner.workspaceId },
      data: { mediaBytes: { decrement: invalid.length } },
    });
    expect(
      await readdir(
        path.join(await workspaceMediaRoot(root, owner.workspaceId), "uploads"),
      ),
    ).toEqual([]);
  });
  it("keeps private files and quota on an ambiguous asset commit", async () => {
    const { service, mediaAsset, workspace } = setup();
    mediaAsset.create.mockRejectedValue(Error("lost database reply"));
    await expect(
      service.upload(
        owner,
        Readable.from(bytes),
        "video/mp4",
        String(bytes.length),
      ),
    ).rejects.toThrow("confirmation unavailable");
    expect(workspace.updateMany).toHaveBeenCalledTimes(1);
    expect(
      await readdir(
        path.join(await workspaceMediaRoot(root, owner.workspaceId), "uploads"),
      ),
    ).toHaveLength(1);
  });
  it("deduplicates only within the authorized workspace and refunds the second reservation", async () => {
    const { service, mediaAsset, workspace } = setup();
    mediaAsset.findUnique.mockResolvedValue({
      id: assetId,
      mimeType: "video/mp4",
      bytes: bytes.length,
    });
    expect(
      await service.upload(
        owner,
        Readable.from(bytes),
        "video/mp4",
        String(bytes.length),
      ),
    ).toMatchObject({ id: assetId });
    expect(mediaAsset.findUnique).toHaveBeenCalledWith({
      where: {
        workspaceId_checksum: {
          workspaceId: owner.workspaceId,
          checksum: expect.any(String),
        },
      },
    });
    expect(mediaAsset.create).not.toHaveBeenCalled();
    expect(workspace.updateMany).toHaveBeenCalledTimes(2);
  });
  it("rejects another workspace asset before charging a render slot", async () => {
    const { service, workspace, mediaAsset } = setup();
    await expect(
      service.create(owner, { assetId, duration: 1, format: "portrait" }),
    ).rejects.toThrow("Video not found");
    expect(mediaAsset.findFirst).toHaveBeenCalledWith({
      where: {
        id: assetId,
        workspaceId: owner.workspaceId,
        storageProvider: "local-private",
      },
    });
    expect(workspace.updateMany).not.toHaveBeenCalled();
  });
  it("never accepts filesystem paths or oversize caption settings", async () => {
    const { service, workspace } = setup();
    await expect(
      service.create(owner, {
        assetId,
        duration: 1,
        format: "portrait",
        input: "/etc/passwd",
      }),
    ).rejects.toThrow("Invalid video");
    await expect(
      service.create(owner, {
        assetId,
        duration: 1,
        format: "portrait",
        captions: [{ text: "x".repeat(121), start: 0, end: 1 }],
      }),
    ).rejects.toThrow("Invalid video");
    expect(workspace.updateMany).not.toHaveBeenCalled();
  });
  it("queries cancellation and download by workspace before returning anything", async () => {
    const { service, mediaRender } = setup();
    await expect(service.cancel(owner, assetId)).rejects.toThrow(
      "Render not found",
    );
    await expect(service.download(owner.workspaceId, assetId)).rejects.toThrow(
      "Render not found",
    );
    expect(mediaRender.findFirst).toHaveBeenCalledWith({
      where: { id: assetId, workspaceId: owner.workspaceId },
    });
  });
});
