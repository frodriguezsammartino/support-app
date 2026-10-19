-- CreateEnum
CREATE TYPE "RequestKind" AS ENUM ('RETIRE', 'UPGRADE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "kind" "RequestKind" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "assetId" TEXT,
    "licenseId" TEXT,
    "taskId" TEXT,
    "targetLabel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "component" TEXT,
    "reason" TEXT NOT NULL,
    "estimatedCostCents" INTEGER,
    "costCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "requestedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Request_number_key" ON "Request"("number");

-- CreateIndex
CREATE INDEX "Request_status_idx" ON "Request"("status");

-- CreateIndex
CREATE INDEX "Request_kind_status_idx" ON "Request"("kind", "status");

-- CreateIndex
CREATE INDEX "Request_assetId_idx" ON "Request"("assetId");

-- CreateIndex
CREATE INDEX "Request_licenseId_idx" ON "Request"("licenseId");

-- CreateIndex
CREATE INDEX "Request_taskId_idx" ON "Request"("taskId");

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MaintenanceTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
