CREATE TYPE "MediaRenderStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
ALTER TABLE "Workspace" ADD COLUMN "mediaBytes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "mediaRenderSlots" INTEGER NOT NULL DEFAULT 50;
CREATE TABLE "MediaRender" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "status" "MediaRenderStatus" NOT NULL DEFAULT 'QUEUED',
  "options" JSONB NOT NULL,
  "outputKey" TEXT,
  "errorCode" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "leaseToken" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaRender_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MediaRender_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MediaRender_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "MediaRender_status_createdAt_idx" ON "MediaRender"("status", "createdAt");
CREATE INDEX "MediaRender_workspaceId_createdAt_idx" ON "MediaRender"("workspaceId", "createdAt");
