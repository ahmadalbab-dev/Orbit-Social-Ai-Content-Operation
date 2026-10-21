import { describe, expect, it, vi } from "vitest";
import {
  CLOUDFLARE_IMAGE_MODEL,
  CloudflareImageEditor,
  parseCloudflareImageResponse,
  validateCloudflareImageEdit,
} from "./cloudflare-image";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jL1sAAAAASUVORK5CYII=",
  "base64",
);
const input = {
  imageDataUrl: `data:image/png;base64,${png.toString("base64")}`,
  prompt: "Keep the product. Create a natural studio background.",
};
const accountId = "a".repeat(32);
const result = (image: unknown = png.toString("base64")) => ({
  success: true,
  errors: [],
  result: { image },
});

describe("Cloudflare Klein image REST adapter", () => {
  it("posts the actual source bytes as multipart input_image_0 to the fixed account/model and decodes the inline result", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json(result()));
    const output = await new CloudflareImageEditor(
      "token_fixture",
      accountId,
      fetcher,
    ).edit(input);
    expect(Buffer.from(output.bytes)).toEqual(png);
    expect(output.contentType).toBe("image/png");
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, request] = fetcher.mock.calls[0];
    expect(url).toBe(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${CLOUDFLARE_IMAGE_MODEL}`,
    );
    expect(request).toMatchObject({
      method: "POST",
      redirect: "error",
      credentials: "omit",
      headers: { Authorization: "Bearer token_fixture" },
    });
    expect(request.signal).toBeInstanceOf(AbortSignal);
    const body = request.body as FormData;
    expect([...body.keys()]).toEqual([
      "prompt",
      "input_image_0",
      "width",
      "height",
    ]);
    expect(body.get("prompt")).toBe(input.prompt);
    expect(body.get("width")).toBe("1024");
    expect(body.get("height")).toBe("1024");
    const image = body.get("input_image_0") as File;
    expect(image.type).toBe("image/png");
    expect(Buffer.from(await image.arrayBuffer())).toEqual(png);
    expect(request.headers).not.toHaveProperty("Content-Type");
    expect(request.headers).not.toHaveProperty("cf-aig-gateway-id");
  });

  it.each([
    [401, "access_denied"],
    [403, "access_denied"],
    [402, "credits_unavailable"],
    [404, "model_unavailable"],
    [429, "rate_limited"],
    [400, "request_rejected"],
    [503, "unavailable"],
  ] as const)(
    "classifies HTTP %s without leaking provider bodies or retrying",
    async (status, code) => {
      const fetcher = vi
        .fn()
        .mockResolvedValue(
          new Response("secret upstream response", { status }),
        );
      await expect(
        new CloudflareImageEditor("token_fixture", accountId, fetcher).edit(
          input,
        ),
      ).rejects.toMatchObject({ code });
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );

  it("accepts only canonical inline image results, never URLs, false success or error envelopes", () => {
    for (const value of [
      null,
      { image: png.toString("base64") },
      { result: {} },
      { ...result(), success: false },
      { ...result(), errors: [{ message: "secret" }] },
      result("https://example.com/image"),
      result("data:image/png;base64," + png.toString("base64")),
      result("%%%%"),
      result("a==="),
      result("AAAA"),
      result(png.toString("base64") + "\n"),
    ])
      expect(() => parseCloudflareImageResponse(value)).toThrow();
    expect(
      parseCloudflareImageResponse({
        result: { image: png.toString("base64") },
      }).contentType,
    ).toBe("image/png");
    expect(
      parseCloudflareImageResponse(
        result(Buffer.from([255, 216, 255, 0]).toString("base64")),
      ).contentType,
    ).toBe("image/jpeg");
  });

  it("bounds both decoded output and streamed response bytes without trusting Content-Length", async () => {
    expect(() =>
      parseCloudflareImageResponse(
        result(Buffer.alloc(4 * 1024 * 1024 + 1).toString("base64")),
      ),
    ).toThrow();
    const chunk = new Uint8Array(1024 * 1024),
      cancel = vi.fn();
    const body = new ReadableStream({
      start(controller) {
        for (let i = 0; i < 7; i++) controller.enqueue(chunk);
      },
      cancel,
    });
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(body, { headers: { "content-type": "application/json" } }),
      );
    await expect(
      new CloudflareImageEditor("token_fixture", accountId, fetcher).edit(
        input,
      ),
    ).rejects.toMatchObject({ code: "invalid_response" });
    expect(cancel).toHaveBeenCalled();
  });

  it.each<Record<string, string>>([
    { "content-type": "text/html" },
    {
      "content-type": "application/json",
      "content-length": String(7 * 1024 * 1024),
    },
  ])(
    "rejects an invalid response type or declared size before parsing",
    async (headers) => {
      const cancel = vi.fn();
      const body = new ReadableStream({ cancel });
      const fetcher = vi
        .fn()
        .mockResolvedValue(new Response(body, { headers }));
      await expect(
        new CloudflareImageEditor("token_fixture", accountId, fetcher).edit(
          input,
        ),
      ).rejects.toMatchObject({ code: "invalid_response" });
      expect(cancel).toHaveBeenCalledOnce();
    },
  );

  it("rejects invalid source, account paths and credentials before dispatch", async () => {
    const fetcher = vi.fn();
    for (const [token, account] of [
      ["", accountId],
      ["token\nfixture", accountId],
      ["token fixture", accountId],
      ["token_fixture", "../other-account"],
      ["token_fixture", "https://example.com"],
      ["token_fixture", "a".repeat(31)],
    ])
      await expect(
        new CloudflareImageEditor(token, account, fetcher).edit(input),
      ).rejects.toMatchObject({ code: "unconfigured" });
    await expect(
      new CloudflareImageEditor("token_fixture", accountId, fetcher).edit({
        ...input,
        imageDataUrl: "https://example.com/photo.png",
      }),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("maps timeout/network/parser failures to safe errors", async () => {
    for (const [error, code] of [
      [new DOMException("secret timeout", "TimeoutError"), "timeout"],
      [Error("secret network config"), "unavailable"],
    ] as const)
      await expect(
        new CloudflareImageEditor(
          "token_fixture",
          accountId,
          vi.fn().mockRejectedValue(error),
        ).edit(input),
      ).rejects.toMatchObject({ code });
    await expect(
      new CloudflareImageEditor(
        "token_fixture",
        accountId,
        vi
          .fn()
          .mockResolvedValue(
            new Response("secret malformed JSON", {
              headers: { "content-type": "application/json" },
            }),
          ),
      ).edit(input),
    ).rejects.toMatchObject({ code: "invalid_response" });
  });
});

describe("Cloudflare reference dimensions", () => {
  const source = (bytes: Buffer, mime = "png") => ({
    ...input,
    imageDataUrl: `data:image/${mime};base64,${bytes.toString("base64")}`,
  });
  const sizedPng = (width: number, height: number) => {
    const bytes = Buffer.from(png);
    bytes.writeUInt32BE(width, 16);
    bytes.writeUInt32BE(height, 20);
    return bytes;
  };
  const jpeg = (width: number, height: number, marker = 0xc0) => {
    const bytes = Buffer.from([
      255,
      216,
      255,
      224,
      0,
      4,
      0,
      0,
      255,
      marker,
      0,
      11,
      8,
      0,
      0,
      0,
      0,
      1,
      1,
      17,
      0,
      255,
      217,
    ]);
    bytes.writeUInt16BE(height, 13);
    bytes.writeUInt16BE(width, 15);
    return bytes;
  };
  it("accepts PNG and baseline/progressive JPEG references up to 511 pixels on each edge", () => {
    for (const [bytes, mime] of [
      [sizedPng(511, 300), "png"],
      [jpeg(300, 511), "jpeg"],
      [jpeg(511, 511, 0xc2), "jpeg"],
    ] as const)
      expect(validateCloudflareImageEdit(source(bytes, mime)).prompt).toBe(
        input.prompt,
      );
  });
  it("rejects zero, 512 and oversized dimensions before any provider request", async () => {
    const fetcher = vi.fn();
    for (const [width, height] of [
      [512, 1],
      [1, 512],
      [0, 1],
      [1, 0],
      [65535, 10],
    ]) {
      for (const [bytes, mime] of [
        [sizedPng(width, height), "png"],
        [jpeg(width, height), "jpeg"],
      ] as const)
        await expect(
          new CloudflareImageEditor("token_fixture", accountId, fetcher).edit(
            source(bytes, mime),
          ),
        ).rejects.toThrow();
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects truncated or malformed headers instead of trusting MIME or magic bytes", () => {
    const badIhdr = sizedPng(1, 1);
    badIhdr.write("IDAT", 12);
    const badJpeg = jpeg(1, 1);
    badJpeg.writeUInt16BE(65535, 4);
    for (const [bytes, mime] of [
      [png.subarray(0, 20), "png"],
      [badIhdr, "png"],
      [badJpeg, "jpeg"],
      [jpeg(1, 1).subarray(0, 17), "jpeg"],
      [Buffer.from([255, 216, 255, 218, 0, 2]), "jpeg"],
    ] as const)
      expect(() => validateCloudflareImageEdit(source(bytes, mime))).toThrow();
  });
});
