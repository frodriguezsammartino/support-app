import { db } from "@/lib/db";
import { PendientesTable } from "@/components/backlog/PendientesTable";
import { HistorialTable } from "@/components/backlog/HistorialTable";

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
        <h1 className="text-xl font-semibold">Pendientes</h1>
        <PendientesTable tickets={pendientes} categories={categories} />
      </div>

      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">Historial de tickets cerrados</h1>
        <HistorialTable tickets={historial} categories={categories} />
      </div>
    </div>
  );
}
