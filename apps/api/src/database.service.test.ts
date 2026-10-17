import { afterEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({ options: vi.fn(), connect: vi.fn(), disconnect: vi.fn(), query: vi.fn() }));
vi.mock("@sma/database", () => ({
  PrismaClient: class {
    constructor(options: unknown) { prisma.options(options); }
    $connect = prisma.connect;
    $disconnect = prisma.disconnect;
    $queryRaw = prisma.query;
  },
}));
import { DatabaseService } from "./database.service";

describe("DatabaseService runtime configuration", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

  it("passes pooler compatibility to the actual Prisma constructor before connecting", async () => {
    const original = "postgresql://fixture:fixture@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
    vi.stubEnv("DATABASE_URL", original);
    const db = new DatabaseService();
    expect(prisma.options).toHaveBeenCalledWith({ datasources: { db: { url: `${original}?pgbouncer=true&connection_limit=1` } } });
    expect(process.env.DATABASE_URL).toBe(original);
    await db.onModuleInit();
    expect(prisma.connect).toHaveBeenCalledOnce();
    await db.readiness();
    expect(prisma.query).toHaveBeenCalledOnce();
    await db.onModuleDestroy();
    expect(prisma.disconnect).toHaveBeenCalledOnce();
  });

  it("retains the explicit missing-database startup check", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const db = new DatabaseService();
    await expect(db.onModuleInit()).rejects.toThrow("DATABASE_URL is required");
    expect(prisma.connect).not.toHaveBeenCalled();
  });
});
