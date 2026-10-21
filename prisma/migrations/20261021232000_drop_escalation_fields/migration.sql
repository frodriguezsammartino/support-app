-- El escalamiento se simplificó: ahora es el estado "Depende de proveedor" del ticket.
ALTER TABLE "Ticket" DROP COLUMN "escalationStatus",
DROP COLUMN "escalationContact",
DROP COLUMN "escalationRef",
DROP COLUMN "escalatedAt";

DROP TYPE "EscalationStatus";
