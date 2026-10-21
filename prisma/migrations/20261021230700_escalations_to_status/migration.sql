-- Los tickets con un escalamiento abierto pasan al estado "Depende de proveedor",
-- y queda anotado desde cuándo esperan.
INSERT INTO "TicketStatusHistory" ("id", "ticketId", "fromStatus", "toStatus", "note", "changedAt")
SELECT md5(random()::text || t."id"), t."id", t."status", 'WAITING_PROVIDER', 'Pasó de escalamiento a estado', COALESCE(t."escalatedAt", now())
FROM "Ticket" t
WHERE t."status" <> 'COMPLETED' AND t."escalationStatus" IN ('WAITING', 'IN_PROGRESS');

UPDATE "Ticket" SET "status" = 'WAITING_PROVIDER'
WHERE "status" <> 'COMPLETED' AND "escalationStatus" IN ('WAITING', 'IN_PROGRESS');
