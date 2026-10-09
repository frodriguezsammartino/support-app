-- CreateEnum
CREATE TYPE "LicensePricing" AS ENUM ('PER_SEAT', 'FLAT');

-- AlterTable
ALTER TABLE "License" ADD COLUMN     "pricing" "LicensePricing" NOT NULL DEFAULT 'FLAT';
