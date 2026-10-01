import { db } from "@/lib/db";
import { MaintenanceTaskCard } from "@/components/maintenance/MaintenanceTaskCard";
import { NewMaintenanceTaskDialog } from "@/components/maintenance/NewMaintenanceTaskDialog";

export default async function MantenimientoPage() {
  const tasks = await db.maintenanceTask.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    include: { completions: { orderBy: { completedAt: "desc" }, take: 20 } },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Mantenimiento</h1>
        <NewMaintenanceTaskDialog />
      </div>

      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-zinc-500">
          Todavía no cargaste ninguna tarea periódica.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tasks.map((task) => (
            <MaintenanceTaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
