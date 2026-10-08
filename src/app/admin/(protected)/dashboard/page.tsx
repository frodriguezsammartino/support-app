import {
  getKpis,
  getMaintenanceCompletionCount,
  getMaintenanceWeeklyTrend,
  getOldestOpenTicketAgeHours,
  getResolutionTimeByCategory,
  getTicketsByAsset,
  getTicketsByCategory,
  getTicketsByPriority,
  getTicketsByStatus,
  getWeeklyTrend,
  rangeToFromDate,
  type StatsFilters,
} from "@/lib/stats";
import { db } from "@/lib/db";
import { getMaintenanceStatus } from "@/lib/maintenance";
import { getLicenseAlert } from "@/lib/licenses";
import { KpiCard } from "@/components/charts/KpiCard";
import { TicketsByCategoryChart } from "@/components/charts/TicketsByCategoryChart";
import { TicketsByAssetChart } from "@/components/charts/TicketsByAssetChart";
import { TicketsByStatusChart } from "@/components/charts/TicketsByStatusChart";
import { TicketsByPriorityChart } from "@/components/charts/TicketsByPriorityChart";
import { ResolutionTimeChart } from "@/components/charts/ResolutionTimeChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { MaintenanceTrendChart } from "@/components/charts/MaintenanceTrendChart";
import { DashboardFilters } from "@/components/admin/DashboardFilters";

function formatHours(hours: number | null) {
  if (hours == null) return "—";
  if (hours < 48) return `${Math.round(hours)} hs`;
  return `${Math.round(hours / 24)} días`;
}

export default async function DashboardPage(props: PageProps<"/admin/dashboard">) {
  const searchParams = await props.searchParams;
  const range = typeof searchParams?.range === "string" ? searchParams.range : "all";
  const categoryId = typeof searchParams?.categoryId === "string" ? searchParams.categoryId : undefined;

  const filters: StatsFilters = { categoryId, from: rangeToFromDate(range) };

  const [
    kpis,
    byCategory,
    byStatus,
    byPriority,
    byAsset,
    resolutionByCategory,
    trend,
    maintenanceTrend,
    maintenanceDone,
    oldestOpenHours,
    maintenanceTasks,
    assetCount,
    licenses,
    categories,
  ] = await Promise.all([
    getKpis(filters),
    getTicketsByCategory(filters),
    getTicketsByStatus(filters),
    getTicketsByPriority(filters),
    getTicketsByAsset(filters),
    getResolutionTimeByCategory(filters),
    getWeeklyTrend(filters),
    getMaintenanceWeeklyTrend(filters),
    getMaintenanceCompletionCount(filters),
    getOldestOpenTicketAgeHours(filters),
    db.maintenanceTask.findMany({ include: { _count: { select: { completions: { where: { kind: "DONE" } } } } } }),
    db.asset.count(),
    db.license.findMany({
      where: { status: "ACTIVE" },
      select: { expiresAt: true, autoRenew: true, status: true, billing: true },
    }),
    db.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const maintenanceOverdue = maintenanceTasks.filter(
    (t) => getMaintenanceStatus(t, t._count.completions) === "OVERDUE"
  ).length;
  // Las de renovación automática no piden acción, así que no suman acá.
  const licensesExpiring = licenses.filter((l) => {
    const alert = getLicenseAlert(l);
    return alert === "EXPIRING" || alert === "EXPIRED";
  }).length;
  const resolutionRate = kpis.total > 0 ? Math.round((kpis.completed / kpis.total) * 100) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-end gap-3">
        <DashboardFilters categories={categories} />
      </div>

      <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Tickets</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total de tickets" value={String(kpis.total)} />
        <KpiCard label="En Espera" value={String(kpis.backlog)} />
        <KpiCard label="En Progreso" value={String(kpis.inProgress)} />
        <KpiCard label="Completados" value={String(kpis.completed)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Tiempo promedio de resolución"
          value={formatHours(kpis.avgResolutionHours)}
        />
        <KpiCard
          label="Tasa de resolución"
          value={resolutionRate == null ? "—" : `${resolutionRate}%`}
        />
        <KpiCard label="Espera del ticket más viejo" value={formatHours(oldestOpenHours)} />
      </div>

      <h2 className="mt-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
        Mantenimiento e inventario
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Tareas periódicas" value={String(maintenanceTasks.length)} />
        <KpiCard label="Mantenimientos realizados" value={String(maintenanceDone)} />
        <KpiCard label="Tareas vencidas ahora" value={String(maintenanceOverdue)} />
        <KpiCard label="Equipos en el inventario" value={String(assetCount)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Licencias activas" value={String(licenses.length)} />
        <KpiCard label="Licencias por vencer" value={String(licensesExpiring)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TicketsByCategoryChart data={byCategory} />
        <TicketsByPriorityChart data={byPriority} />
        <TicketsByStatusChart data={byStatus} />
        <ResolutionTimeChart data={resolutionByCategory} />
        <TicketsByAssetChart data={byAsset} />
        <TrendChart data={trend} />
        <MaintenanceTrendChart data={maintenanceTrend} />
      </div>
    </div>
  );
}
