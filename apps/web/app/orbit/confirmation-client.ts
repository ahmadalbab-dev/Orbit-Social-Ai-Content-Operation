import { publicAuthConfig } from "./auth-client";

/** Confirmation never opens a workspace or persists the email-link session. */
export async function confirmEmailRedirect(
  fragment: string,
  config = publicAuthConfig(),
): Promise<string | null> {
  const params = new URLSearchParams(fragment.replace(/^#/, ""));
  if (params.has("error") || params.has("error_code"))
    return "This confirmation link has expired or was already used. Try signing in if you have already confirmed your email.";
  if (params.get("type") !== "signup") return null;
  const token = params.get("access_token");
  if (!config || !token || token.length > 16384)
    return "We couldn't verify this confirmation. Please sign in or request a new email.";
  try {
    const response = await fetch(`${config.url}/auth/v1/user`, {
      headers: { apikey: config.key, Authorization: `Bearer ${token}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(20000),
    });
    const user = await response.json().catch(() => ({}));
    if (!response.ok || typeof user.email_confirmed_at !== "string" || !user.email_confirmed_at)
      return "We couldn't verify this confirmation. Please sign in or request a new email.";
    return "Email confirmed. Sign in to open your Orbit workspace.";
  } catch {
    return "We couldn't check your confirmation right now. Try signing in, or check your connection and retry.";
  } finally {
    try {
      await fetch(`${config.url}/auth/v1/logout?scope=local`, {
        method: "POST",
        headers: { apikey: config.key, Authorization: `Bearer ${token}` },
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
    } catch { /* Discard locally even if the provider is unavailable. */ }
  }
}
