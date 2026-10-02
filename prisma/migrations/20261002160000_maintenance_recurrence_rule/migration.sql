-- CreateEnum
CREATE TYPE "MaintenanceFreq" AS ENUM ('HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR');
CREATE TYPE "MaintenanceMonthlyMode" AS ENUM ('DAY_OF_MONTH', 'NTH_WEEKDAY');
CREATE TYPE "MaintenanceEndType" AS ENUM ('NEVER', 'ON_DATE', 'AFTER_COUNT');

-- AlterTable: columnas nuevas de la regla de repeticion
ALTER TABLE "MaintenanceTask"
  ADD COLUMN "freq" "MaintenanceFreq" NOT NULL DEFAULT 'DAY',
  ADD COLUMN "interval" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "weekdays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "monthlyMode" "MaintenanceMonthlyMode",
  ADD COLUMN "monthOfYear" INTEGER,
  ADD COLUMN "endType" "MaintenanceEndType" NOT NULL DEFAULT 'NEVER',
  ADD COLUMN "endDate" TIMESTAMP(3),
  ADD COLUMN "endCount" INTEGER;

-- Migracion de datos: traduce las agendas viejas a la regla nueva
UPDATE "MaintenanceTask" SET
  "freq" = (CASE
    WHEN "scheduleType" = 'DAILY' THEN 'DAY'
    WHEN "scheduleType" = 'WEEKLY' THEN 'WEEK'
    WHEN "scheduleType" IN ('MONTHLY_DAY', 'MONTHLY_NTH_WEEKDAY') THEN 'MONTH'
    WHEN "intervalHours" % 24 = 0 THEN 'DAY'
    ELSE 'HOUR'
  END)::"MaintenanceFreq",
  "interval" = (CASE
    WHEN "scheduleType" <> 'INTERVAL' THEN 1
    WHEN "intervalHours" % 24 = 0 THEN "intervalHours" / 24
    ELSE "intervalHours"
  END),
  "weekdays" = (CASE
    WHEN "weekday" IS NOT NULL THEN ARRAY["weekday"]
    ELSE ARRAY[]::INTEGER[]
  END),
  "monthlyMode" = (CASE
    WHEN "scheduleType" = 'MONTHLY_DAY' THEN 'DAY_OF_MONTH'
    WHEN "scheduleType" = 'MONTHLY_NTH_WEEKDAY' THEN 'NTH_WEEKDAY'
    ELSE NULL
  END)::"MaintenanceMonthlyMode";

-- AlterTable: fuera lo viejo
ALTER TABLE "MaintenanceTask"
  DROP COLUMN "scheduleType",
  DROP COLUMN "intervalHours",
  DROP COLUMN "weekday",
  DROP COLUMN "active";

DROP TYPE "MaintenanceScheduleType";
