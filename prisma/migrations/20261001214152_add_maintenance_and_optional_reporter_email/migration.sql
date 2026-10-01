-- AlterTable
ALTER TABLE "Ticket" ALTER COLUMN "reporterEmail" DROP NOT NULL;

-- CreateTable
CREATE TABLE "MaintenanceTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "intervalHours" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceCompletion" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "note" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceTask_active_idx" ON "MaintenanceTask"("active");

-- CreateIndex
CREATE INDEX "MaintenanceCompletion_taskId_idx" ON "MaintenanceCompletion"("taskId");

-- AddForeignKey
ALTER TABLE "MaintenanceCompletion" ADD CONSTRAINT "MaintenanceCompletion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MaintenanceTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
