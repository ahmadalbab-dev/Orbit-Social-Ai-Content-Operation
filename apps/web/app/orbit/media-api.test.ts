import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelRender,
  queueRender,
  renderDownload,
  uploadVideo,
} from "./media-api";
import { apiResponse } from "./session-api";
vi.mock("./session-api", () => ({ apiResponse: vi.fn() }));
const response = vi.mocked(apiResponse);
beforeEach(() => response.mockReset());
describe("private workspace media requests", () => {
  it("uploads raw binary without manually setting the browser's content length", async () => {
    const file = new File(["video"], "scene.mp4", { type: "video/mp4" });
    response.mockResolvedValue(
      Response.json({ id: "asset-1", mimeType: file.type, bytes: file.size }),
    );
    await uploadVideo(file);
    expect(response).toHaveBeenCalledWith(
      "/media/assets",
      expect.objectContaining({
        method: "POST",
        body: file,
        headers: { "Content-Type": "video/mp4" },
      }),
    );
  });
  it("sends render settings to the authenticated API helper", async () => {
    const input = {
      assetId: "asset-1",
      start: 0,
      duration: 3,
      format: "portrait" as const,
      news: { title: "Kuala Lumpur", date: "16 Oktober 2026" },
    };
    response.mockResolvedValue(
      Response.json({ id: "job-1", status: "QUEUED" }),
    );
    await expect(queueRender(input)).resolves.toMatchObject({
      status: "QUEUED",
    });
    expect(response).toHaveBeenCalledWith(
      "/media/renders",
      expect.objectContaining({ method: "POST", body: JSON.stringify(input) }),
    );
  });
  it("uses an authenticated download and refuses a JSON response", async () => {
    response.mockResolvedValue(Response.json({ status: "PROCESSING" }));
    await expect(renderDownload("job-1")).rejects.toThrow(
      "MP4 is not available",
    );
    response.mockResolvedValue(
      new Response("mp4 bytes", { headers: { "Content-Type": "video/mp4" } }),
    );
    expect(await (await renderDownload("job-1")).text()).toBe("mp4 bytes");
  });
  it("encodes job IDs and forwards cancellation signals", async () => {
    const controller = new AbortController();
    response.mockResolvedValue(
      Response.json({ id: "job-1", status: "CANCELLED" }),
    );
    await cancelRender("job/path", controller.signal);
    expect(response).toHaveBeenCalledWith(
      "/media/renders/job%2Fpath/cancel",
      expect.objectContaining({ signal: controller.signal, method: "POST" }),
    );
  });
});
