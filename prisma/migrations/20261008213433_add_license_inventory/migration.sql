-- CreateEnum
CREATE TYPE "LicenseBilling" AS ENUM ('MONTHLY', 'YEARLY', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "code" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "vendor" TEXT,
    "seatsTotal" INTEGER NOT NULL DEFAULT 1,
    "seatsAssigned" INTEGER NOT NULL DEFAULT 0,
    "costCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "billing" "LicenseBilling" NOT NULL DEFAULT 'YEARLY',
    "expiresAt" TIMESTAMP(3),
    "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "License_code_key" ON "License"("code");

-- CreateIndex
CREATE INDEX "License_status_idx" ON "License"("status");
