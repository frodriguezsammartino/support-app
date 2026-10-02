-- CreateEnum
CREATE TYPE "MaintenanceScheduleType" AS ENUM ('INTERVAL', 'DAILY', 'WEEKLY', 'MONTHLY_DAY', 'MONTHLY_NTH_WEEKDAY');

-- AlterTable
ALTER TABLE "MaintenanceTask" ADD COLUMN     "monthDay" INTEGER,
ADD COLUMN     "nthWeek" INTEGER,
ADD COLUMN     "scheduleType" "MaintenanceScheduleType" NOT NULL DEFAULT 'INTERVAL',
ADD COLUMN     "timeOfDay" INTEGER,
ADD COLUMN     "weekday" INTEGER;
