CREATE TABLE "BillingAccount" (
  "id" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "organizationId" TEXT NOT NULL,
  "customerId" TEXT, "subscriptionId" TEXT, "plan" TEXT, "priceId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'none', "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "currentPeriodEnd" TIMESTAMP(3), "paidThrough" TIMESTAMP(3),
  "pendingRequestId" TEXT, "pendingPlan" TEXT, "pendingSince" TIMESTAMP(3), "checkoutSessionId" TEXT,
  "reconciledAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "BillingAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BillingAccount_workspaceId_key" ON "BillingAccount"("workspaceId");
CREATE UNIQUE INDEX "BillingAccount_customerId_key" ON "BillingAccount"("customerId");
CREATE UNIQUE INDEX "BillingAccount_subscriptionId_key" ON "BillingAccount"("subscriptionId");
ALTER TABLE "BillingAccount" ADD CONSTRAINT "BillingAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "BillingEvent" ("id" TEXT NOT NULL, "type" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id"));
