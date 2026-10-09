-- CreateEnum
CREATE TYPE "LicenseKind" AS ENUM ('SOFTWARE', 'SERVICE', 'SUPPORT', 'OTHER');

-- AlterTable
ALTER TABLE "License" ADD COLUMN     "kind" "LicenseKind" NOT NULL DEFAULT 'SOFTWARE';
