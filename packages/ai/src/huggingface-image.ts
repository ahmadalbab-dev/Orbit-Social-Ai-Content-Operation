import { AiProviderError, aiProviderResponseError } from "./huggingface.js";
/** Fixed HF router adapter. See HF image-editor guide and inference 4.13.32 fal-ai.ts. */
export const HF_IMAGE_MODEL = "Qwen/Qwen-Image-Edit";
export const HF_IMAGE_ENDPOINT =
  "https://router.huggingface.co/fal-ai/fal-ai/qwen-image-edit";
const MAX_INPUT = 2 * 1024 * 1024;
const MAX_OUTPUT = 4 * 1024 * 1024;
export class ImageEditError extends Error {
  constructor(public readonly kind: "input" | "unavailable" | "response") {
    super(`Image editing ${kind}`);
  }
}
export function validateImageEdit(input: unknown): {
  imageDataUrl: string;
  prompt: string;
} {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new ImageEditError("input");
  const obj = input as Record<string, unknown>;
  if (
    Object.keys(obj).some((k) => !["imageDataUrl", "prompt"].includes(k)) ||
    typeof obj.imageDataUrl !== "string" ||
    typeof obj.prompt !== "string"
  )
    throw new ImageEditError("input");
  const prompt = obj.prompt.trim();
  if (
    !prompt ||
    prompt.length > 2000 ||
    obj.imageDataUrl.length > Math.ceil(MAX_INPUT / 3) * 4 + 30
  )
    throw new ImageEditError("input");
  const match =
    /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      obj.imageDataUrl,
    );
  if (!match || match[2].length % 4 !== 0) throw new ImageEditError("input");
  const bytes = Buffer.from(match[2], "base64");
  if (
    bytes.length > MAX_INPUT ||
    bytes.toString("base64") !== match[2] ||
    mime(bytes) !== match[1]
  )
    throw new ImageEditError("input");
  return { imageDataUrl: obj.imageDataUrl, prompt };
}
function mime(bytes: Uint8Array): string | undefined {
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
async function bounded(response: Response, limit: number): Promise<Uint8Array> {
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw aiProviderResponseError(response.status);
  }
  if (!response.body) throw new ImageEditError("response");
  if (Number(response.headers.get("content-length")) > limit) {
    await response.body.cancel();
    throw new ImageEditError("response");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > limit) throw new ImageEditError("response");
      chunks.push(next.value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
async function metadata(response: Response): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(Buffer.from(await bounded(response, 32768)).toString());
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    throw new ImageEditError("response");
  }
}
export class HuggingFaceImageEditor {
  constructor(
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}
  async edit(
    input: unknown,
  ): Promise<{ bytes: Uint8Array; contentType: string }> {
    const body = validateImageEdit(input);
    if (!this.apiKey.trim() || /[\r\n]/.test(this.apiKey))
      throw new ImageEditError("unavailable");
    const signal = AbortSignal.timeout(45000);
    const headers = {
      Authorization: `Bearer ${this.apiKey.trim()}`,
      "Content-Type": "application/json",
    };
    const options = {
      headers,
      signal,
      redirect: "error" as const,
      credentials: "omit" as const,
    };
    try {
      const queued = await metadata(
        await this.fetcher(`${HF_IMAGE_ENDPOINT}?_subdomain=queue`, {
          ...options,
          method: "POST",
          body: JSON.stringify({
            prompt: body.prompt,
            image_url: body.imageDataUrl,
            num_images: 1,
            output_format: "png",
            enable_safety_checker: true,
          }),
        }),
      );
      if (
        typeof queued.request_id !== "string" ||
        !/^[A-Za-z0-9_-]{1,100}$/.test(queued.request_id)
      )
        throw new ImageEditError("response");
      // Construct every authenticated URL ourselves. Never trust response_url/status_url.
      const resultUrl = `${HF_IMAGE_ENDPOINT}/requests/${queued.request_id}`;
      let status = queued.status;
      for (let attempt = 0; status !== "COMPLETED"; attempt++) {
        if (
          attempt >= 20 ||
          (status !== "IN_QUEUE" && status !== "IN_PROGRESS")
        )
          throw new ImageEditError("unavailable");
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(done, 2000);
          function done() {
            signal.removeEventListener("abort", aborted);
            resolve();
          }
          function aborted() {
            clearTimeout(timer);
            reject(new ImageEditError("unavailable"));
          }
          signal.addEventListener("abort", aborted, { once: true });
          if (signal.aborted) aborted();
        });
        status = (
          await metadata(
            await this.fetcher(`${resultUrl}/status?_subdomain=queue`, options),
          )
        ).status;
      }
      const result = await metadata(
        await this.fetcher(`${resultUrl}?_subdomain=queue`, options),
      );
      const images = result.images as { url?: unknown }[] | undefined;
      if (!Array.isArray(images) || typeof images[0]?.url !== "string")
        throw new ImageEditError("response");
      const url = new URL(images[0].url);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        url.port ||
        url.hash ||
        !(url.hostname === "fal.media" || url.hostname.endsWith(".fal.media"))
      )
        throw new ImageEditError("response");
      const response = await this.fetcher(url.toString(), {
        signal,
        credentials: "omit",
        redirect: "error",
      });
      const bytes = await bounded(response, MAX_OUTPUT);
      const contentType = mime(bytes);
      if (
        !contentType ||
        response.headers.get("content-type")?.split(";")[0] !== contentType
      )
        throw new ImageEditError("response");
      return { bytes, contentType };
    } catch (error) {
      if (error instanceof ImageEditError || error instanceof AiProviderError)
        throw error;
      throw new ImageEditError("unavailable");
    }
  }
}
