import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@sma/database";
import type { ClaimedRender, RenderStore } from "@sma/media/worker";

export function createRenderStore(prisma: PrismaClient): RenderStore {
  return {
    async claim() {
      await prisma.mediaRender.updateMany({
        where: {
          status: "PROCESSING",
          leaseUntil: { lt: new Date() },
          attempts: { gte: 3 },
        },
        data: {
          status: "FAILED",
          errorCode: "RETRY_EXHAUSTED",
          leaseToken: null,
          leaseUntil: null,
        },
      });
      const token = randomUUID();
      const jobs = await prisma.$queryRaw<ClaimedRender[]>`
        UPDATE "MediaRender" SET "status" = 'PROCESSING', "attempts" = "attempts" + 1,
          "leaseToken" = ${token}, "leaseUntil" = NOW() + INTERVAL '10 minutes', "updatedAt" = NOW()
        WHERE "id" = (
          SELECT "id" FROM "MediaRender"
          WHERE "attempts" < 3 AND ("status" = 'QUEUED' OR ("status" = 'PROCESSING' AND "leaseUntil" < NOW()))
          ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1
        ) RETURNING "id", "workspaceId", "assetId", "leaseToken", "options"`;
      return jobs[0] ?? null;
    },
    asset(id) {
      return prisma.mediaAsset.findUnique({
        where: { id },
        select: {
          workspaceId: true,
          storageProvider: true,
          storageKey: true,
          mimeType: true,
        },
      });
    },
    async stillOwned(job) {
      return (
        (await prisma.mediaRender.count({
          where: {
            id: job.id,
            status: "PROCESSING",
            leaseToken: job.leaseToken,
          },
        })) === 1
      );
    },
    async complete(job, outputKey) {
      const result = await prisma.mediaRender.updateMany({
        where: { id: job.id, status: "PROCESSING", leaseToken: job.leaseToken },
        data: {
          status: "SUCCEEDED",
          outputKey,
          errorCode: null,
          leaseToken: null,
          leaseUntil: null,
        },
      });
      return result.count === 1;
    },
    async fail(job, errorCode) {
      await prisma.mediaRender.updateMany({
        where: { id: job.id, status: "PROCESSING", leaseToken: job.leaseToken },
        data: {
          status: "FAILED",
          errorCode,
          leaseToken: null,
          leaseUntil: null,
        },
      });
    },
  };
}
