-- AlterTable: responsable del equipo (solo para PC y notebooks)
ALTER TABLE "Asset" ADD COLUMN "owner" TEXT;

-- AlterEnum: entra STOCK ("en inventario") y sale RETIRED ("de baja").
-- Postgres no deja quitar valores de un enum, asi que se arma uno nuevo y se cambia la columna.
CREATE TYPE "AssetStatus_new" AS ENUM ('ACTIVE', 'STOCK', 'REPAIR');

ALTER TABLE "Asset" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Asset"
  ALTER COLUMN "status" TYPE "AssetStatus_new"
  USING (CASE WHEN "status" = 'RETIRED' THEN 'STOCK' ELSE "status"::text END)::"AssetStatus_new";

ALTER TABLE "Asset" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

DROP TYPE "AssetStatus";
ALTER TYPE "AssetStatus_new" RENAME TO "AssetStatus";
