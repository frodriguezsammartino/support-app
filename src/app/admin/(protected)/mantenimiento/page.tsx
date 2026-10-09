import { db } from "@/lib/db";
import { toMaintenanceRow } from "@/lib/maintenance";
import { MaintenanceSummary } from "@/components/maintenance/MaintenanceSummary";
import { MaintenanceTable } from "@/components/maintenance/MaintenanceTable";
import { NewMaintenanceTaskDialog } from "@/components/maintenance/NewMaintenanceTaskDialog";

export default async function MantenimientoPage() {
  const [tasks, assets] = await Promise.all([
    db.maintenanceTask.findMany({
      include: {
        _count: { select: { completions: { where: { kind: "DONE" } } } },
        asset: { select: { id: true, code: true, name: true } },
      },
    }),
    db.asset.findMany({
      select: { id: true, code: true, name: true, location: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const rows = tasks.map((task) => toMaintenanceRow(task, task._count.completions));

  // Lo que vence antes va arriba: la primera fila siempre es la que hay que atender.
  const sorted = [...rows].sort((a, b) => a.nextDueAt.getTime() - b.nextDueAt.getTime());

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <NewMaintenanceTaskDialog assets={assets} />
      </div>

      <MaintenanceSummary rows={rows} />
      <MaintenanceTable rows={sorted} />
    </div>
  );
}
