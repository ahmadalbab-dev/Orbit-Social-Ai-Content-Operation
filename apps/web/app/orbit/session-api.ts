import { apiOrigin } from "./api-origin";
let session: { token: string; workspaceId: string } | null = null;
export function setApiSession(next: typeof session) {
  session = next;
}

/** Binary upload/download and JSON calls share the same in-memory identity. */
export async function apiResponse(
  path: string,
  init: RequestInit = {},
  workspace = true,
): Promise<Response> {
  const base = apiOrigin(
    process.env.NEXT_PUBLIC_API_URL,
    process.env.NODE_ENV === "production",
  );
  const current = session;
  if (!current?.token) throw Error("Sign in to access your workspace.");
  if (workspace && !current.workspaceId)
    throw Error("Choose or create a workspace first.");
  if (!base) throw Error("Workspace API is not configured yet.");
  // Encoded IDs may contain slashes; URL normalization must never escape /v1.
  if (!path.startsWith("/") || path.startsWith("//") || /[\\?#]/.test(path))
    throw Error("Invalid workspace API path.");
  const destination = new URL(`${base}/v1${path}`);
  if (destination.origin !== base || !destination.pathname.startsWith("/v1/"))
    throw Error("Invalid workspace API path.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${current.token}`);
  if (workspace) headers.set("x-workspace-id", current.workspaceId);
  const response = await fetch(destination.href, {
    ...init,
    cache: "no-store",
    headers,
    redirect: "error",
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 401)
      throw Error("Your session has expired. Sign out and sign in again.");
    throw Error(
      typeof data.message === "string"
        ? data.message
        : `Request failed (${response.status}).`,
    );
  }
  return response;
}

export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  workspace = true,
): Promise<T> {
  const response = await apiResponse(
    path,
    {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    },
    workspace,
  );
  return response.json() as Promise<T>;
}
