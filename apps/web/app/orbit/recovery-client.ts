import { publicAuthConfig } from "./auth-client";
type Config = NonNullable<ReturnType<typeof publicAuthConfig>>;
async function recoveryRequest(
  config: Config,
  path: string,
  body: unknown,
  token?: string,
) {
  let response: Response;
  try {
    response = await fetch(`${config.url}/auth/v1/${path}`, {
      method: path === "user" ? "PUT" : "POST",
      headers: {
        apikey: config.key,
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw Error("Cannot reach the recovery service. Try again later.");
  }
  if (!response.ok)
    throw Error(
      response.status === 429
        ? "Too many attempts. Wait before trying again."
        : "Recovery could not be completed. Check the code or request a new email.",
    );
  return response;
}
export async function requestRecovery(
  email: string,
  config = publicAuthConfig(),
) {
  if (!config) throw Error("Password recovery is not configured yet.");
  await recoveryRequest(config, "recover", { email });
}
/** Code verification creates a temporary provider session, never an Orbit workspace session. */
export async function resetRecoveredPassword(
  email: string,
  code: string,
  password: string,
  config = publicAuthConfig(),
) {
  if (!config) throw Error("Password recovery is not configured yet.");
  if (!code || password.length < 8 || password.length > 256)
    throw Error(
      "Enter a recovery code and a password of at least 8 characters.",
    );
  const response = await recoveryRequest(config, "verify", {
    email,
    token: code,
    type: "recovery",
  });
  const session = await response.json().catch(() => ({}));
  if (typeof session.access_token !== "string" || !session.access_token)
    throw Error("The recovery service did not return a valid session.");
  try {
    await recoveryRequest(config, "user", { password }, session.access_token);
  } finally {
    try {
      await fetch(`${config.url}/auth/v1/logout?scope=local`, {
        method: "POST",
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${session.access_token}`,
        },
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      /* Temporary session is discarded locally even if revocation is unavailable. */
    }
  }
}
