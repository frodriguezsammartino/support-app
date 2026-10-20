-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RequestKind" ADD VALUE 'CHANGE';
ALTER TYPE "RequestKind" ADD VALUE 'REPLACE';
ALTER TYPE "RequestKind" ADD VALUE 'PURCHASE';

-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "items" JSONB,
ADD COLUMN     "ticketId" TEXT,
ALTER COLUMN "reason" SET DEFAULT '';

-- CreateTable
CREATE TABLE "AssetComponent" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetComponent_assetId_idx" ON "AssetComponent"("assetId");

-- CreateIndex
CREATE INDEX "Request_ticketId_idx" ON "Request"("ticketId");

-- AddForeignKey
ALTER TABLE "AssetComponent" ADD CONSTRAINT "AssetComponent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
