import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, realpath, rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Transform, type Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
export const WORKSPACE_UPLOAD_BYTES = 1024 * 1024 * 1024;
export const MIME_EXTENSIONS = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
} as const;
const uploadKey = /^uploads\/[0-9a-f-]{36}\.(mp4|mov|webm)$/;
const exportKey = /^exports\/[0-9a-f-]{36}-[0-9a-f-]{36}\.mp4$/;

/** MEDIA_ROOT is private operator configuration, never a request parameter. */
export async function workspaceMediaRoot(root: string, workspaceId: string) {
  if (!path.isAbsolute(root)) throw Error("Absolute media root required");
  const canonical = await realpath(root);
  const directory = path.join(
    canonical,
    createHash("sha256").update(workspaceId).digest("hex"),
  );
  await mkdir(directory, { recursive: true, mode: 0o700 });
  if ((await realpath(directory)) !== directory)
    throw Error("Invalid workspace directory");
  return directory;
}
export async function mediaPath(
  root: string,
  key: string,
  kind: "upload" | "export",
) {
  if (!(kind === "upload" ? uploadKey : exportKey).test(key))
    throw Error("Invalid media key");
  const filename = path.join(root, key);
  if ((await realpath(filename)) !== filename)
    throw Error("Invalid media file");
  return filename;
}

/** Stream to an exclusive private file; verify actual bytes and magic, not a filename. */
export async function storeVideo(
  stream: Readable,
  root: string,
  mimeType: keyof typeof MIME_EXTENSIONS,
  expectedBytes: number,
) {
  const uploads = path.join(root, "uploads");
  await mkdir(uploads, { recursive: true, mode: 0o700 });
  if ((await realpath(uploads)) !== uploads)
    throw Error("Invalid uploads directory");
  const key = `uploads/${randomUUID()}.${MIME_EXTENSIONS[mimeType]}`;
  const filename = path.join(root, key);
  const hash = createHash("sha256");
  let bytes = 0;
  const meter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > expectedBytes || bytes > MAX_UPLOAD_BYTES)
        return callback(Error("Upload limit exceeded"));
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  try {
    await pipeline(
      stream,
      meter,
      createWriteStream(filename, { flags: "wx", mode: 0o600 }),
    );
    if (bytes !== expectedBytes || bytes < 12)
      throw Error("Invalid upload size");
    const file = await open(filename, "r");
    const magic = Buffer.alloc(12);
    try {
      await file.read(magic, 0, 12, 0);
    } finally {
      await file.close();
    }
    const valid =
      mimeType === "video/webm"
        ? magic.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
        : magic.toString("ascii", 4, 8) === "ftyp";
    if (!valid) throw Error("Unsupported video bytes");
    return { key, filename, bytes, checksum: hash.digest("hex") };
  } catch (error) {
    await rm(filename, { force: true });
    throw error;
  }
}
