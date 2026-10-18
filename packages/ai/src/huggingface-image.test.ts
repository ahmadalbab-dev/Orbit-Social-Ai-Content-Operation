import { describe, expect, it, vi } from "vitest";
import {
  HF_IMAGE_ENDPOINT,
  HuggingFaceImageEditor,
  validateImageEdit,
} from "./huggingface-image";
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
const input = {
  imageDataUrl: `data:image/png;base64,${png.toString("base64")}`,
  prompt: "Make the background blue",
};
function queue(url = "https://v3.fal.media/files/result.png") {
  return vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        request_id: "test-id",
        status: "COMPLETED",
        response_url: "http://169.254.169.254/",
      }),
    )
    .mockResolvedValueOnce(Response.json({ images: [{ url }] }))
    .mockResolvedValueOnce(
      new Response(png, { headers: { "Content-Type": "image/png" } }),
    );
}
describe("fixed HF image editing", () => {
  it("validates inline PNG/JPEG and rejects SVG, remote URLs and oversized input", () => {
    expect(validateImageEdit(input)).toEqual(input);
    for (const imageDataUrl of [
      "https://example.com/image.png",
      "data:image/svg+xml;base64,PHN2Zz4=",
      `data:image/jpeg;base64,${png.toString("base64")}`,
      `data:image/png;base64,${Buffer.alloc(2097153).toString("base64")}`,
    ]) {
      expect(() => validateImageEdit({ ...input, imageDataUrl })).toThrow();
    }
    expect(() =>
      validateImageEdit({ ...input, provider: "anything" }),
    ).toThrow();
  });
  it("uses a fixed router, ignores response URLs and never sends the key to output CDN", async () => {
    const fetcher = queue();
    const result = await new HuggingFaceImageEditor("hf_test", fetcher).edit(
      input,
    );
    expect(result.contentType).toBe("image/png");
    expect(fetcher.mock.calls[0][0]).toBe(
      `${HF_IMAGE_ENDPOINT}?_subdomain=queue`,
    );
    expect(fetcher.mock.calls[1][0]).toBe(
      `${HF_IMAGE_ENDPOINT}/requests/test-id?_subdomain=queue`,
    );
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe(
      "Bearer hf_test",
    );
    expect(fetcher.mock.calls[2][1]).toMatchObject({
      credentials: "omit",
      redirect: "error",
    });
    expect(fetcher.mock.calls[2][1].headers).toBeUndefined();
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
      image_url: input.imageDataUrl,
      enable_safety_checker: true,
      num_images: 1,
    });
  });
  it.each([
    "http://fal.media/x",
    "https://fal.media.evil.example/x",
    "https://127.0.0.1/x",
    "https://user:pass@fal.media/x",
    "https://fal.media:444/x",
  ])("blocks untrusted output URL %s", async (url) => {
    const fetcher = queue(url);
    await expect(
      new HuggingFaceImageEditor("hf_test", fetcher).edit(input),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("bounds output bytes and refuses non-image payloads", async () => {
    const fetcher = queue();
    fetcher
      .mockReset()
      .mockResolvedValueOnce(
        Response.json({ request_id: "id", status: "COMPLETED" }),
      )
      .mockResolvedValueOnce(
        Response.json({ images: [{ url: "https://fal.media/x" }] }),
      )
      .mockResolvedValueOnce(
        new Response("oops", {
          headers: { "Content-Type": "image/png", "Content-Length": "4194305" },
        }),
      );
    await expect(
      new HuggingFaceImageEditor("hf_test", fetcher).edit(input),
    ).rejects.toThrow();
  });
  it("rejects request IDs containing path traversal", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({ request_id: "../admin", status: "COMPLETED" }),
      );
    await expect(
      new HuggingFaceImageEditor("hf_test", fetcher).edit(input),
    ).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("masks provider text and token details", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValue(Error("hf_secret provider raw payload"));
    await expect(
      new HuggingFaceImageEditor("hf_test", fetcher).edit(input),
    ).rejects.toThrow("Image editing unavailable");
  });
  it.each([
    [401, "access_denied"],
    [402, "credits_unavailable"],
    [429, "rate_limited"],
    [500, "unavailable"],
  ])(
    "retains HTTP %s classification without exposing upstream text",
    async (status, code) => {
      const fetcher = vi
        .fn()
        .mockResolvedValue(
          new Response("raw secret hf_token", { status: Number(status) }),
        );
      await expect(
        new HuggingFaceImageEditor("hf_test", fetcher).edit(input),
      ).rejects.toMatchObject({ code });
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
});
