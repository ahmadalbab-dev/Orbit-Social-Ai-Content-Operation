/** The configured API is a credential destination, not a general URL or proxy. */
export function apiOrigin(
  value: string | undefined,
  production: boolean,
): string | null {
  if (!value) return production ? null : "http://localhost:3001";
  try {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      return null;
    if (
      url.protocol !== "https:" &&
      !(url.protocol === "http:" && !production && local)
    )
      return null;
    if (production && local) return null;
    return url.origin;
  } catch {
    return null;
  }
}
