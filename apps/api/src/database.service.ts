import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@sma/database";
import { runtimeDatabaseUrl } from "./database-config";

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const url = process.env.DATABASE_URL;
    super(url ? { datasources: { db: { url: runtimeDatabaseUrl(url) } } } : undefined);
  }
  async onModuleInit() {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required; configure PostgreSQL and apply migrations before starting Orbit");
    await this.$connect();
  }
  async onModuleDestroy() { await this.$disconnect(); }
  async readiness() { await this.$queryRaw`SELECT 1`; return true; }
}
