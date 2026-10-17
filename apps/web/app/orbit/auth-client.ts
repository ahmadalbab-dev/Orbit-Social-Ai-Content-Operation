/** Public Auth API only. Service-role keys and session persistence are intentionally excluded. */
export function publicAuthConfig(
  url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
) {
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" &&
      !(
        process.env.NODE_ENV !== "production" &&
        ["localhost", "127.0.0.1"].includes(parsed.hostname)
      )
    )
      return null;
    if (key.startsWith("sb_secret_")) return null;
    if (!key.startsWith("sb_publishable_")) {
      const claims = JSON.parse(
        atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      if (claims.role !== "anon") return null;
    }
    return { url: parsed.origin, key };
  } catch {
    return null;
  }
}
export type AuthSession = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
};
export async function passwordAuth(
  kind: "signin" | "signup",
  email: string,
  password: string,
  config = publicAuthConfig(),
): Promise<AuthSession | null> {
  if (!config) throw Error("Customer sign-in is not configured yet.");
  let response: Response;
  try {
    response = await fetch(
      `${config.url}/auth/v1/${kind === "signup" ? "signup" : "token?grant_type=password"}`,
      {
        method: "POST",
        headers: { apikey: config.key, "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
        signal: AbortSignal.timeout(20000),
        redirect: "error",
      },
    );
  } catch {
    throw Error("Cannot reach the sign-in service. Please try again later.");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Translate only documented codes. Never reflect provider messages or credentials.
    const code = body?.code ?? body?.error_code;
    const message = response.status === 429 || code === "over_email_send_rate_limit"
      ? "Too many attempts. Wait a few minutes before trying again."
      : code === "email_not_confirmed"
        ? "Confirm your email before signing in. Check your inbox and spam folder."
        : kind === "signin" && code === "invalid_credentials"
          ? "Email or password is incorrect. New to Orbit? Create an account first."
          : kind === "signup" && code === "weak_password"
            ? "Choose a stronger password with at least 8 characters."
            : kind === "signup" && ["email_address_not_authorized", "email_address_not_authorized_to_send"].includes(code)
              ? "We couldn't send a confirmation email. Please contact support to finish account setup."
              : kind === "signup" && ["signup_disabled", "email_provider_disabled"].includes(code)
                ? "Account registration is currently unavailable. Please contact support."
                : kind === "signin"
                  ? "Could not sign in. Check your email and password, or create an account if you're new."
                  : "Could not complete sign-up. Check your details or contact support.";
    throw Error(message);
  }
  if (
    typeof body.access_token === "string" &&
    typeof body.expires_in === "number" &&
    Number.isFinite(body.expires_in) &&
    body.expires_in > 0
  )
    return {
      access_token: body.access_token,
      expires_in: body.expires_in,
      ...(typeof body.refresh_token === "string" && body.refresh_token
        ? { refresh_token: body.refresh_token }
        : {}),
    };
  if (kind === "signup") return null;
  throw Error("The sign-in service did not return a valid session.");
}
export async function revokeSession(token: string) {
  const config = publicAuthConfig();
  if (!config) return;
  try {
    await fetch(`${config.url}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: config.key, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
  } catch {
    /* Local session still clears. */
  }
}

/** Refresh tokens only travel in a POST body to the configured identity service. */
export async function refreshAuth(
  refreshToken: string,
  config = publicAuthConfig(),
): Promise<AuthSession> {
  if (!config) throw Error("Customer sign-in is not configured yet.");
  let response: Response;
  try {
    response = await fetch(
      `${config.url}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: { apikey: config.key, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
        signal: AbortSignal.timeout(20000),
        redirect: "error",
        cache: "no-store",
      },
    );
  } catch {
    throw Error("Cannot renew your session. Sign in again.");
  }
  const body = await response.json().catch(() => ({}));
  if (
    !response.ok ||
    typeof body.access_token !== "string" ||
    !body.access_token ||
    typeof body.refresh_token !== "string" ||
    !body.refresh_token ||
    typeof body.expires_in !== "number" ||
    !Number.isFinite(body.expires_in) ||
    body.expires_in <= 0
  )
    throw Error("Cannot renew your session. Sign in again.");
  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_in: body.expires_in,
  };
}
