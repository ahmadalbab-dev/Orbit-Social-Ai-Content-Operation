import { describe, expect, it } from "vitest";
import { runtimeDatabaseUrl } from "./database-config";

const pooler = "postgresql://postgres.test:fixture%40password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";

describe("runtime database connection configuration", () => {
  it("uses Prisma transaction pooling compatibility and one connection for Supabase", () => {
    const url = new URL(runtimeDatabaseUrl(`${pooler}?sslmode=require`));
    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("connection_limit")).toBe("1");
    expect(url.searchParams.get("sslmode")).toBe("require");
    expect(url.username).toBe("postgres.test");
    expect(url.password).toBe("fixture%40password");
    expect(url.pathname).toBe("/postgres");
  });

  it("corrects incompatible prepared statements while preserving pool sizing and is idempotent", () => {
    const configured = `${pooler}?pgbouncer=false&connection_limit=4&schema=private`;
    expect(runtimeDatabaseUrl(configured)).toBe(configured.replace("pgbouncer=false", "pgbouncer=true"));
    const normalized = runtimeDatabaseUrl(pooler);
    expect(runtimeDatabaseUrl(normalized)).toBe(normalized);
  });

  it.each([
    "postgresql://fixture:fixture@localhost:6543/postgres",
    "postgresql://fixture:fixture@db.test.supabase.co:5432/postgres",
    "postgresql://fixture:fixture@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
    "postgresql://fixture:fixture@aws-0.pooler.supabase.com.example.org:6543/postgres",
    "not-a-database-url",
  ])("does not rewrite direct, session, other-provider or malformed URLs", (url) => {
    expect(runtimeDatabaseUrl(url)).toBe(url);
  });
});
