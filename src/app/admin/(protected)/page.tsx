import { db } from "@/lib/db";
import { TECH_NAME, getRole, reporterFor } from "@/lib/adminAuth";
import { CategoriesDialog } from "@/components/backlog/CategoriesDialog";
import { PendientesTable } from "@/components/backlog/PendientesTable";
import { HistorialTable } from "@/components/backlog/HistorialTable";
import { NewInternalTicketDialog } from "@/components/backlog/NewInternalTicketDialog";
import { TasksSummary } from "@/components/backlog/TasksSummary";

export default async function HomePage() {
  const role = (await getRole()) ?? "TECH";
  const [pendientes, historial, allCategories, assets, providers] = await Promise.all([
    db.ticket.findMany({
      where: { status: { not: "COMPLETED" } },
      include: { category: true, provider: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.ticket.findMany({
      where: { status: "COMPLETED" },
      include: { category: true },
      orderBy: { completedAt: "desc" },
      take: 50,
    }),
    db.category.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { tickets: true } } } }),
    db.asset.findMany({
      select: { id: true, code: true, name: true, location: true },
      orderBy: { code: "asc" },
    }),
    db.provider.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const categories = allCategories.filter((c) => c.active);

  return (
    <div className="flex flex-col gap-8">
      <TasksSummary tickets={pendientes} />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Pendientes</h2>
          <div className="flex items-center gap-2">
            {role === "ADMIN" && (
              <CategoriesDialog
                categories={allCategories.map((c) => ({
                  id: c.id,
                  name: c.name,
                  active: c.active,
                  askAsset: c.askAsset,
                  askProvider: c.askProvider,
                  tickets: c._count.tickets,
                }))}
              />
            )}
            <NewInternalTicketDialog
              categories={categories}
              assets={assets}
              providers={providers}
              reporterName={reporterFor(role)}
            />
          </div>
        </div>
        <PendientesTable tickets={pendientes} categories={categories} techName={TECH_NAME} />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Historial de tickets cerrados</h2>
        <HistorialTable tickets={historial} categories={categories} />
      </div>
    </div>
  );
}
