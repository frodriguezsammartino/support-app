-- CreateEnum
CREATE TYPE "EscalationStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'RESOLVED');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "escalatedAt" TIMESTAMP(3),
ADD COLUMN     "escalationContact" TEXT,
ADD COLUMN     "escalationRef" TEXT,
ADD COLUMN     "escalationStatus" "EscalationStatus",
ADD COLUMN     "providerId" TEXT;

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "covers" TEXT,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Provider_name_key" ON "Provider"("name");

-- CreateIndex
CREATE INDEX "Ticket_providerId_idx" ON "Ticket"("providerId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
