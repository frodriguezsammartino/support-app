import { db } from "./db";

/**
 * Qué equipos, licencias y tareas ya tienen una baja pedida y sin resolver, para
 * marcarlos en las tablas y no dejar pedir la misma baja dos veces.
 */
export async function getPendingRetireIds() {
  const rows = await db.request.findMany({
    where: { kind: "RETIRE", status: "PENDING" },
    select: { assetId: true, licenseId: true, taskId: true },
  });
  const ids = (pick: (r: (typeof rows)[number]) => string | null) =>
    rows.map(pick).filter((id): id is string => id !== null);

  return {
    assets: ids((r) => r.assetId),
    licenses: ids((r) => r.licenseId),
    tasks: ids((r) => r.taskId),
  };
}
