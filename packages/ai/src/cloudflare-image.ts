import {
  AiProviderError,
  aiProviderResponseError,
  readBoundedAiJson,
} from "./huggingface.js";
import { ImageEditError, validateImageEdit } from "./huggingface-image.js";

/** Workers AI REST multipart contract, checked 2026-10-22:
 * https://developers.cloudflare.com/changelog/post/2026-01-15-flux-2-klein-4b-workers-ai/
 * https://developers.cloudflare.com/workers-ai/models/flux-2-klein-4b/
 * The caller shares a reduced reference smaller than 512px on each edge.
 */
export const CLOUDFLARE_IMAGE_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
const MAX_OUTPUT = 4 * 1024 * 1024;
const MAX_ENCODED_OUTPUT = Math.ceil(MAX_OUTPUT / 3) * 4;
const MAX_RESPONSE = MAX_ENCODED_OUTPUT + 65536;
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/** Inspect bounded PNG/JPEG headers without decoding untrusted pixel data. */
export function validateCloudflareImageEdit(value: unknown) {
  const input = validateImageEdit(value);
  const bytes = Buffer.from(
    input.imageDataUrl.slice(input.imageDataUrl.indexOf(",") + 1),
    "base64",
  );
  let width = 0,
    height = 0;
  if (input.imageDataUrl.startsWith("data:image/png;")) {
    if (
      bytes.length < 33 ||
      bytes.readUInt32BE(8) !== 13 ||
      bytes.toString("ascii", 12, 16) !== "IHDR"
    )
      throw new ImageEditError("input");
    width = bytes.readUInt32BE(16);
    height = bytes.readUInt32BE(20);
  } else {
    let offset = 2;
    while (offset < bytes.length) {
      if (bytes[offset++] !== 0xff) throw new ImageEditError("input");
      while (offset < bytes.length && bytes[offset] === 0xff) offset++;
      if (offset >= bytes.length) throw new ImageEditError("input");
      const marker = bytes[offset++];
      // Dimensions must appear before compressed scan data or the end marker.
      if (
        marker === 0xda ||
        marker === 0xd9 ||
        marker === 0x00 ||
        marker === 0xd8
      )
        break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) throw new ImageEditError("input");
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length)
        throw new ImageEditError("input");
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      ) {
        if (
          length < 8 ||
          !bytes[offset + 7] ||
          bytes[offset + 7] > 4 ||
          length !== 8 + 3 * bytes[offset + 7]
        )
          throw new ImageEditError("input");
        height = bytes.readUInt16BE(offset + 3);
        width = bytes.readUInt16BE(offset + 5);
        break;
      }
      offset += length;
    }
  }
  if (!width || !height || width >= 512 || height >= 512)
    throw new ImageEditError("input");
  return input;
}

function imageMime(bytes: Uint8Array) {
  if (
    bytes.length >= 8 &&
    Buffer.from(bytes.subarray(0, 8)).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    )
  )
    return "image/png";
  if (
    bytes.length >= 3 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    return "image/jpeg";
  if (
    bytes.length >= 12 &&
    Buffer.from(bytes.subarray(0, 4)).toString() === "RIFF" &&
    Buffer.from(bytes.subarray(8, 12)).toString() === "WEBP"
  )
    return "image/webp";
}

/** REST wraps the model's {image: base64} output inside result. Never fetch output URLs. */
export function parseCloudflareImageResponse(value: unknown): {
  bytes: Uint8Array;
  contentType: string;
} {
  if (
    !object(value) ||
    (value.success !== undefined && value.success !== true) ||
    (value.errors !== undefined &&
      (!Array.isArray(value.errors) || value.errors.length !== 0)) ||
    !object(value.result)
  )
    throw new AiProviderError("invalid_response");
  const data = value.result.image;
  if (
    typeof data !== "string" ||
    !data.length ||
    data.length > MAX_ENCODED_OUTPUT ||
    data.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(data)
  )
    throw new AiProviderError("invalid_response");
  const bytes = Buffer.from(data, "base64"),
    contentType = imageMime(bytes);
  if (
    bytes.length > MAX_OUTPUT ||
    bytes.toString("base64") !== data ||
    !contentType
  )
    throw new AiProviderError("invalid_response");
  return { bytes, contentType };
}

export class CloudflareImageEditor {
  constructor(
    private readonly apiToken: string,
    private readonly accountId: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}
  async edit(
    value: unknown,
  ): Promise<{ bytes: Uint8Array; contentType: string }> {
    const input = validateCloudflareImageEdit(value);
    const token = this.apiToken.trim(),
      accountId = this.accountId.trim();
    if (
      !token ||
      token.length > 1024 ||
      /[\r\n]/.test(this.apiToken + this.accountId) ||
      /[^\x21-\x7e]/.test(token) ||
      accountId.length !== 32 ||
      !/^[a-f0-9]{32}$/i.test(accountId)
    )
      throw new AiProviderError("unconfigured");
    const [, mimeType, data] = /^data:(image\/(?:png|jpeg));base64,(.+)$/.exec(
      input.imageDataUrl,
    )!;
    const body = new FormData();
    body.append("prompt", input.prompt);
    body.append(
      "input_image_0",
      new Blob([Buffer.from(data, "base64")], { type: mimeType }),
      mimeType === "image/png" ? "reference.png" : "reference.jpg",
    );
    body.append("width", "1024");
    body.append("height", "1024");
    try {
      const response = await this.fetcher(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${CLOUDFLARE_IMAGE_MODEL}`,
        {
          method: "POST",
          redirect: "error",
          credentials: "omit",
          signal: AbortSignal.timeout(45000),
          // FormData sets its own multipart boundary. No AI Gateway/paid-provider fallback.
          headers: { Authorization: `Bearer ${token}` },
          body,
        },
      );
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        throw aiProviderResponseError(response.status);
      }
      if (
        !/^application\/json(?:;|$)/i.test(
          response.headers.get("content-type") ?? "",
        ) ||
        Number(response.headers.get("content-length")) > MAX_RESPONSE
      ) {
        await response.body?.cancel().catch(() => {});
        throw new AiProviderError("invalid_response");
      }
      return parseCloudflareImageResponse(
        await readBoundedAiJson(response, MAX_RESPONSE),
      );
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      if (
        error instanceof Error &&
        ["TimeoutError", "AbortError"].includes(error.name)
      )
        throw new AiProviderError("timeout");
      throw new AiProviderError("unavailable");
    }
  }
}
