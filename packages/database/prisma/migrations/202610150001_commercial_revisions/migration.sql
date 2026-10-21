-- Additive migration. Existing revisions begin at 1; existing approvals must be
-- reviewed again before scheduling through the commercial workflow.
ALTER TABLE "ContentItem" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Approval" ADD COLUMN "contentRevision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Schedule" ADD COLUMN "contentRevision" INTEGER NOT NULL DEFAULT 1;
CREATE TABLE "ContentRevision" (
  "id" TEXT NOT NULL,
  "contentItemId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "variants" JSONB NOT NULL,
  "actorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ContentRevision_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ContentRevision_contentItemId_revision_key" ON "ContentRevision"("contentItemId", "revision");
ALTER TABLE "AiUsage" ADD COLUMN "variants" JSONB;
CREATE TABLE "AiQuota" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "used" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "AiQuota_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AiQuota_workspaceId_period_key" ON "AiQuota"("workspaceId", "period");
