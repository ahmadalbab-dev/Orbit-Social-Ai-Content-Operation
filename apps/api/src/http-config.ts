import { isIP } from "node:net";
/** Exact origin only. Never reflect arbitrary request Origin or trust proxy headers blindly. */
export function webOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const production = env.NODE_ENV === "production";
  const value =
    env.WEB_URL ?? (!production ? "http://localhost:3000" : undefined);
  if (!value)
    throw Error("WEB_URL must be configured before production startup.");
  try {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      (url.protocol !== "https:" &&
        !(url.protocol === "http:" && !production && local)) ||
      (production && local)
    )
      throw Error("Invalid origin");
    return url.origin;
  } catch {
    throw Error("WEB_URL must be an exact HTTPS web origin in production.");
  }
}

/** Only explicit proxy IPs are accepted. No wildcard, hop-count guess or blanket trust. */
export function trustedProxyIps(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const raw = env.TRUSTED_PROXY_IPS;
  if (!raw) return [];
  const ips = raw.split(",").map((value) => value.trim());
  if (ips.length > 16 || ips.some((ip) => !isIP(ip)))
    throw Error("TRUSTED_PROXY_IPS must contain explicit proxy IP addresses.");
  return ips;
}
