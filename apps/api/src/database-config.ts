/** Prisma 6 must disable named prepared statements behind Supavisor transaction pooling. */
export function runtimeDatabaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    // Let Prisma validate malformed configuration without including credentials in our errors.
    return value;
  }
  const transactionPooler =
    (url.protocol === "postgres:" || url.protocol === "postgresql:") &&
    url.hostname.endsWith(".pooler.supabase.com") &&
    url.port === "6543";
  if (!transactionPooler) return value;

  // Named statements are unsupported on this endpoint, even if false was configured.
  // Keep pool sizing overrides and migration/session/direct connections unchanged.
  url.searchParams.set("pgbouncer", "true");
  if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "1");
  return url.toString();
}
