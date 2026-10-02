import { db } from "@/lib/db";
import { toMaintenanceRow } from "@/lib/maintenance";
import { MaintenanceSummary } from "@/components/maintenance/MaintenanceSummary";
import { MaintenanceTable } from "@/components/maintenance/MaintenanceTable";
import { NewMaintenanceTaskDialog } from "@/components/maintenance/NewMaintenanceTaskDialog";

export default async function MantenimientoPage() {
  const tasks = await db.maintenanceTask.findMany({
    include: { _count: { select: { completions: true } } },
  });

  const rows = tasks.map((task) => toMaintenanceRow(task, task._count.completions));

  // Las activas primero, y dentro de ellas lo que vence antes arriba: así la primera
  // fila siempre es la que hay que atender.
  const sorted = [...rows].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.nextDueAt.getTime() - b.nextDueAt.getTime();
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Mantenimiento</h1>
        <NewMaintenanceTaskDialog />
      </div>

      <MaintenanceSummary rows={rows} />
      <MaintenanceTable rows={sorted} />
    </div>
  );
}
