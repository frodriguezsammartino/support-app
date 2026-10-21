-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "askAsset" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "askProvider" BOOLEAN NOT NULL DEFAULT false;
