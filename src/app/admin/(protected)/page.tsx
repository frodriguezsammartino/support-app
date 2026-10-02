import { db } from "@/lib/db";
import { PendientesTable } from "@/components/backlog/PendientesTable";
import { HistorialTable } from "@/components/backlog/HistorialTable";
import { NewInternalTicketDialog } from "@/components/backlog/NewInternalTicketDialog";

export default async function HomePage() {
  const [pendientes, historial, categories] = await Promise.all([
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
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Pendientes</h2>
          <NewInternalTicketDialog categories={categories} />
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
