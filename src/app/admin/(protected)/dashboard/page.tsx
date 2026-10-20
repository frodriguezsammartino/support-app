import {
  getKpis,
  getMaintenanceCompletionCount,
  getMaintenanceWeeklyTrend,
  getOldestOpenTicketAgeHours,
  getOpenSnapshot,
  getResolutionTimeByCategory,
  getTicketsByAsset,
  getTicketsByCategory,
  getTicketsByPriority,
  getWeeklyActivity,
  rangeToFromDate,
  type StatsFilters,
} from "@/lib/stats";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { getMaintenanceStatus } from "@/lib/maintenance";
import { annualWastedCents, getLicenseAlert, getPaymentCalendar } from "@/lib/licenses";
import { monthlySeries, resolvePeriod, summarizeExpenses, type ExpenseMode } from "@/lib/expenses";
import { ExpensesSummary } from "@/components/admin/ExpensesSummary";
import { PaymentCalendar } from "@/components/licenses/PaymentCalendar";
import { KpiCard } from "@/components/charts/KpiCard";
import { TicketActivityChart } from "@/components/charts/TicketActivityChart";
import { TicketsByPriorityChart } from "@/components/charts/TicketsByPriorityChart";
import { TicketsByCategoryChart } from "@/components/charts/TicketsByCategoryChart";
import { ResolutionTimeChart } from "@/components/charts/ResolutionTimeChart";
import { TicketsByAssetChart } from "@/components/charts/TicketsByAssetChart";
import { MaintenanceTrendChart } from "@/components/charts/MaintenanceTrendChart";
import { DashboardFilters } from "@/components/admin/DashboardFilters";

function formatHours(hours: number | null) {
  if (hours == null) return "—";
  if (hours < 1) return "menos de 1 h";
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} días`;
}

function SectionTitle({ children, hint }: { children: string; hint?: string }) {
  return (
    <div className="mt-2 flex flex-wrap items-baseline gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</h2>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </div>
  );
}

export default async function DashboardPage(props: PageProps<"/admin/dashboard">) {
  await requireAdmin();
  const searchParams = await props.searchParams;
  const range = typeof searchParams?.range === "string" ? searchParams.range : "all";
  const categoryId = typeof searchParams?.categoryId === "string" ? searchParams.categoryId : undefined;

  const filters: StatsFilters = { categoryId, from: rangeToFromDate(range) };

  const [
    kpis,
    snapshot,
    byCategory,
    byPriority,
    resolutionByCategory,
    byAsset,
    activity,
    maintenanceTrend,
    maintenanceDone,
    oldestOpenHours,
    maintenanceTasks,
    licenses,
    categories,
    approvedUpgrades,
  ] = await Promise.all([
    getKpis(filters),
    getOpenSnapshot(categoryId),
    getTicketsByCategory(filters),
    getTicketsByPriority(filters),
    getResolutionTimeByCategory(filters),
    getTicketsByAsset(filters),
    getWeeklyActivity(filters),
    getMaintenanceWeeklyTrend(filters),
    getMaintenanceCompletionCount(filters),
    getOldestOpenTicketAgeHours(),
    db.maintenanceTask.findMany({
      include: { _count: { select: { completions: { where: { kind: "DONE" } } } } },
    }),
    db.license.findMany({ where: { status: "ACTIVE" } }),
    db.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.request.findMany({
      where: { kind: "UPGRADE", status: "APPROVED", costCents: { not: null } },
      select: { id: true, title: true, targetLabel: true, costCents: true, currency: true, decidedAt: true },
    }),
  ]);

  const maintenanceOverdue = maintenanceTasks.filter(
    (t) => getMaintenanceStatus(t, t._count.completions) === "OVERDUE"
  ).length;

  // Las de renovación automática no piden acción: se cobran solas.
  const licensesNeedingAction = licenses.filter((l) => {
    const alert = getLicenseAlert(l);
    return alert === "EXPIRING" || alert === "EXPIRED";
  }).length;

  // ---- Resumen de gastos: mensual o anual, del período que se elija (por defecto el actual).
  const gastoMode: ExpenseMode = searchParams?.gasto === "anio" ? "anio" : "mes";
  const period = resolvePeriod(
    gastoMode,
    typeof searchParams?.periodo === "string" ? searchParams.periodo : undefined
  );
  const summary = summarizeExpenses(licenses, approvedUpgrades, period.from, period.to);
  const series =
    period.mode === "anio" ? monthlySeries(licenses, approvedUpgrades, Number(period.key)) : undefined;

  // Plata que se va por puestos pagos que nadie usa, por año y por moneda.
  const wastedByCurrency = licenses.reduce<Record<string, number>>((acc, l) => {
    acc[l.currency] = (acc[l.currency] ?? 0) + annualWastedCents(l);
    return acc;
  }, {});
  const wastedRows = Object.keys(wastedByCurrency)
    .sort()
    .map((currency) => ({ currency, cents: wastedByCurrency[currency] }));

  // Los links del resumen conservan los filtros de tickets que ya estén elegidos.
  const keep = new URLSearchParams();
  for (const key of ["range", "categoryId"]) {
    const value = searchParams?.[key];
    if (typeof value === "string") keep.set(key, value);
  }
  const expenseHref = (mode: ExpenseMode, key: string) => {
    const params = new URLSearchParams(keep);
    params.set("gasto", mode);
    params.set("periodo", key);
    return `/admin/dashboard?${params.toString()}`;
  };
  const currentMonthKey = resolvePeriod("mes", undefined).key;
  const expenseHrefs = {
    // Al pasar de año a mes se queda en el mes de hoy si es el año actual, o en enero si no.
    mes: expenseHref(
      "mes",
      period.mode === "mes" ? period.key : period.isCurrent ? currentMonthKey : `${period.key}-01`
    ),
    anio: expenseHref("anio", period.mode === "anio" ? period.key : period.key.slice(0, 4)),
    prev: expenseHref(period.mode, period.prevKey),
    next: expenseHref(period.mode, period.nextKey),
    today: expenseHref(period.mode, period.currentKey),
  };

  const resolutionRate = kpis.total > 0 ? Math.round((kpis.completed / kpis.total) * 100) : null;

  return (
    <div className="flex flex-col gap-4">
      <ExpensesSummary
        period={period}
        summary={summary}
        series={series}
        wastedRows={wastedRows}
        hrefs={expenseHrefs}
        calendar={<PaymentCalendar months={getPaymentCalendar(licenses, 12)} />}
      />

      <div className="flex flex-wrap items-end justify-end gap-3 border-t border-line pt-4">
        <DashboardFilters categories={categories} />
      </div>

      <SectionTitle hint="sin importar el período elegido">Situación ahora</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Tickets abiertos" value={String(snapshot.open)} />
        <KpiCard label="Urgentes sin resolver" value={String(snapshot.urgent)} />
        <KpiCard label="Mantenimientos vencidos" value={String(maintenanceOverdue)} />
        <KpiCard label="Licencias a renovar" value={String(licensesNeedingAction)} />
      </div>

      <SectionTitle hint="según el período y la categoría del filtro">Rendimiento</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Tickets creados" value={String(kpis.total)} />
        <KpiCard label="Tickets resueltos" value={String(kpis.completed)} />
        <KpiCard
          label="Tasa de resolución"
          value={resolutionRate == null ? "—" : `${resolutionRate}%`}
        />
        <KpiCard label="Tiempo promedio" value={formatHours(kpis.avgResolutionHours)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Espera del más viejo" value={formatHours(oldestOpenHours)} />
        <KpiCard label="Sin clasificar" value={String(snapshot.untriaged)} />
        <KpiCard label="Mantenimientos hechos" value={String(maintenanceDone)} />
        <KpiCard label="Tareas periódicas" value={String(maintenanceTasks.length)} />
      </div>

      <SectionTitle>Tendencias</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <TicketActivityChart data={activity} />
        <TicketsByPriorityChart data={byPriority} />
        <TicketsByCategoryChart data={byCategory} />
        <ResolutionTimeChart data={resolutionByCategory} />
        <TicketsByAssetChart data={byAsset} />
        <MaintenanceTrendChart data={maintenanceTrend} />
      </div>
    </div>
  );
}
