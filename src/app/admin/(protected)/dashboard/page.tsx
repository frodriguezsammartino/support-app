import {
  getKpis,
  getResolutionTimeByCategory,
  getTicketsByCategory,
  getTicketsByStatus,
  getWeeklyTrend,
  type StatsFilters,
} from "@/lib/stats";
import { db } from "@/lib/db";
import { KpiCard } from "@/components/charts/KpiCard";
import { TicketsByCategoryChart } from "@/components/charts/TicketsByCategoryChart";
import { TicketsByStatusChart } from "@/components/charts/TicketsByStatusChart";
import { ResolutionTimeChart } from "@/components/charts/ResolutionTimeChart";
import { TrendChart } from "@/components/charts/TrendChart";
import { DashboardFilters } from "@/components/admin/DashboardFilters";

export default async function DashboardPage(props: PageProps<"/admin/dashboard">) {
  const searchParams = await props.searchParams;
  const range = typeof searchParams?.range === "string" ? searchParams.range : "all";
  const categoryId = typeof searchParams?.categoryId === "string" ? searchParams.categoryId : undefined;

  const filters: StatsFilters = { categoryId };
  if (range !== "all") {
    const days = Number(range);
    if (!Number.isNaN(days)) {
      filters.from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }
  }

  const [kpis, byCategory, byStatus, resolutionByCategory, trend, categories] = await Promise.all([
    getKpis(filters),
    getTicketsByCategory(filters),
    getTicketsByStatus(filters),
    getResolutionTimeByCategory(filters),
    getWeeklyTrend(filters),
    db.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <DashboardFilters categories={categories} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total de tickets" value={String(kpis.total)} />
        <KpiCard label="En Espera" value={String(kpis.backlog)} />
        <KpiCard label="En Progreso" value={String(kpis.inProgress)} />
        <KpiCard
          label="Tiempo promedio de resolución"
          value={kpis.avgResolutionHours ? `${Math.round(kpis.avgResolutionHours * 10) / 10} hs` : "—"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TicketsByCategoryChart data={byCategory} />
        <TicketsByStatusChart data={byStatus} />
        <ResolutionTimeChart data={resolutionByCategory} />
        <TrendChart data={trend} />
      </div>
    </div>
  );
}
