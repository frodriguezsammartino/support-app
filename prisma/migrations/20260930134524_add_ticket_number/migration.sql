-- CreateSequence
CREATE SEQUENCE IF NOT EXISTS "Ticket_number_seq";

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "number" INTEGER NOT NULL DEFAULT nextval('"Ticket_number_seq"');

-- Attach sequence ownership
ALTER SEQUENCE "Ticket_number_seq" OWNED BY "Ticket"."number";

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_number_key" ON "Ticket"("number");
