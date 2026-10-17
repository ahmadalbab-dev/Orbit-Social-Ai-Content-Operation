import { apiOrigin } from "../../orbit/api-origin";

const MAX_BODY = 4 * 1024 * 1024;
const routes: [string, RegExp][] = [
  ["GET", /^(workspaces|brands|content|ai\/status|integrations\/status|media\/status|media\/renders|media\/image-edit\/status|billing\/status)$/],
  ["POST", /^(workspaces|brands|content\/(manual|generate)|billing\/(checkout|portal)|media\/(assets|renders|image-edit|video-plan))$/],
  ["PUT", /^brands\/[A-Za-z0-9_-]+$/],
  ["PUT", /^content\/[A-Za-z0-9_-]+\/review$/],
  ["POST", /^content\/[A-Za-z0-9_-]+\/(approve|schedule|publish)$/],
  ["POST", /^media\/renders\/[A-Za-z0-9_-]+\/cancel$/],
  ["GET", /^media\/renders\/[A-Za-z0-9_-]+\/download$/],
];
function failure(status: number, message: string) {
  return Response.json({ message }, { status, headers: { "Cache-Control": "private, no-store" } });
}
/** Fixed credential destination; deliberately excludes webhooks and arbitrary URLs. */
export async function relayWorkspace(request: Request, segments: string[], fetcher: typeof fetch = fetch) {
  const path = segments.join("/");
  if (segments.some(s => !/^[A-Za-z0-9_-]+$/.test(s)) || !routes.some(([method, pattern]) => method === request.method && pattern.test(path)))
    return failure(404, "Workspace route not found.");
  const base = apiOrigin(process.env.NEXT_PUBLIC_API_URL, process.env.NODE_ENV === "production");
  if (!base || base === new URL(request.url).origin) return failure(503, "Workspace API is not configured yet.");
  const authorization = request.headers.get("authorization");
  if (!authorization || !/^Bearer [^\s]{1,16384}$/i.test(authorization)) return failure(401, "Sign in to access your workspace.");
  const headers = new Headers({ Authorization: authorization });
  const workspaceId = request.headers.get("x-workspace-id");
  if (workspaceId) {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(workspaceId)) return failure(400, "Invalid workspace.");
    headers.set("x-workspace-id", workspaceId);
  }
  const type = request.headers.get("content-type");
  if (type) headers.set("content-type", type);
  let body: Uint8Array<ArrayBuffer> | undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    const suppliedLength = request.headers.get("content-length");
    if (suppliedLength && (!/^\d+$/.test(suppliedLength) || Number(suppliedLength) > MAX_BODY)) return failure(413, "Upload is too large for this workspace connection.");
    const reader = request.body?.getReader();
    if (reader) {
      const chunks: Uint8Array[] = []; let bytes = 0;
      try {
        while (true) {
          const result = await reader.read(); if (result.done) break;
          bytes += result.value.byteLength;
          if (bytes > MAX_BODY) { await reader.cancel(); return failure(413, "Upload is too large for this workspace connection."); }
          chunks.push(result.value);
        }
      } catch { return failure(400, "Request upload was interrupted."); }
      body = new Uint8Array(bytes); let offset = 0;
      for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
      // Computed from bounded bytes, never copied from untrusted input.
      headers.set("content-length", String(bytes));
    }
  }
  try {
    const upstream = await fetcher(`${base}/v1/${path}`, {
      method: request.method, headers, ...(body ? { body } : {}),
      cache: "no-store", redirect: "manual", credentials: "omit",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(55000)]),
    });
    if (upstream.status >= 300 && upstream.status < 400) {
      await upstream.body?.cancel();
      return failure(502, "Workspace API returned an unexpected redirect. Please contact support.");
    }
    const responseHeaders = new Headers({ "Cache-Control": "private, no-store" });
    for (const name of ["content-type", "content-disposition"]) {
      const value = upstream.headers.get(name); if (value) responseHeaders.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return failure(502, "Cannot reach the workspace service. Please try again shortly.");
  }
}
