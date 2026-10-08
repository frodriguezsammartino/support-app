-- CreateEnum
CREATE TYPE "MaintenanceLogKind" AS ENUM ('DONE', 'NOTE');

-- AlterTable
ALTER TABLE "License" ADD COLUMN     "autoRenew" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "MaintenanceCompletion" ADD COLUMN     "kind" "MaintenanceLogKind" NOT NULL DEFAULT 'DONE';
