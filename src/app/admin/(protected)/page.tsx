import { db } from "@/lib/db";
import { toMaintenanceRow } from "@/lib/maintenance";
import { PRIORITY_RANK } from "@/lib/priority";
import { PendientesTable } from "@/components/backlog/PendientesTable";
import { HistorialTable } from "@/components/backlog/HistorialTable";
import { NewInternalTicketDialog } from "@/components/backlog/NewInternalTicketDialog";
import { TodayPanel } from "@/components/admin/TodayPanel";

export default async function HomePage() {
  const [pendientes, historial, categories, assets, maintenanceTasks] = await Promise.all([
    db.ticket.findMany({
      where: { status: { in: ["BACKLOG", "IN_PROGRESS"] } },
      include: { category: true },
      orderBy: { createdAt: "asc" },
    }),
    db.ticket.findMany({
      where: { status: "COMPLETED" },
      include: { category: true },
      orderBy: { completedAt: "desc" },
      take: 50,
    }),
    db.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.asset.findMany({
      where: { status: { not: "RETIRED" } },
      select: { id: true, code: true, name: true, location: true },
      orderBy: { code: "asc" },
    }),
    db.maintenanceTask.findMany({ include: { _count: { select: { completions: true } } } }),
  ]);

  // "Hoy" = lo que nadie va a venir a reclamar (mantenimiento vencido o por vencer)
  // más los tickets abiertos que el reportante marcó como alta o urgente.
  const maintenanceToday = maintenanceTasks
    .map((task) => toMaintenanceRow(task, task._count.completions))
    .filter((row) => row.status === "OVERDUE" || row.status === "DUE_SOON")
    .sort((a, b) => a.nextDueAt.getTime() - b.nextDueAt.getTime());

  const ticketsToday = pendientes
    .filter((t) => t.priority === "URGENT" || t.priority === "HIGH")
    .sort(
      (a, b) =>
        (b.priority ? PRIORITY_RANK[b.priority] : 0) - (a.priority ? PRIORITY_RANK[a.priority] : 0) ||
        a.createdAt.getTime() - b.createdAt.getTime()
    );

  return (
    <div className="flex flex-col gap-8">
      <TodayPanel tickets={ticketsToday} maintenance={maintenanceToday} />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Pendientes</h2>
          <NewInternalTicketDialog categories={categories} assets={assets} />
        </div>
        <PendientesTable tickets={pendientes} categories={categories} />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Historial de tickets cerrados</h2>
        <HistorialTable tickets={historial} categories={categories} />
      </div>
    </div>
  );
}
