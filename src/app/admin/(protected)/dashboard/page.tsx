import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  getEscalationSnapshot,
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
import { getWarrantyState } from "@/lib/assets";
import { toMaintenanceRow } from "@/lib/maintenance";
import {
  ALERT_META,
  KIND_SHORT,
  annualWastedCents,
  getLicenseAlert,
  getPaymentCalendar,
  groupOfKind,
  hasSeats,
} from "@/lib/licenses";
import { OS_CATALOG, getSupportState, hasSoftware } from "@/lib/os";
import { monthlySeries, resolvePeriod, summarizeExpenses, type ExpenseMode } from "@/lib/expenses";
import { ExpensesSummary } from "@/components/admin/ExpensesSummary";
import { DashboardFilters } from "@/components/admin/DashboardFilters";
import { AssetsByOsChart, type OsCount } from "@/components/charts/AssetsByOsChart";
import { KpiCard } from "@/components/charts/KpiCard";
import { MaintenanceTrendChart } from "@/components/charts/MaintenanceTrendChart";
import { MoneyCard } from "@/components/charts/MoneyCard";
import { ResolutionTimeChart } from "@/components/charts/ResolutionTimeChart";
import { TicketActivityChart } from "@/components/charts/TicketActivityChart";
import { TicketsByAssetChart } from "@/components/charts/TicketsByAssetChart";
import { TicketsByCategoryChart } from "@/components/charts/TicketsByCategoryChart";
import { TicketsByPriorityChart } from "@/components/charts/TicketsByPriorityChart";
import { PaymentCalendar } from "@/components/licenses/PaymentCalendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTabs, type PageTab } from "@/components/ui/page-tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Vista = "tareas" | "mantenimiento" | "licencias" | "equipos" | "gastos";
const VISTAS: Vista[] = ["tareas", "mantenimiento", "licencias", "equipos", "gastos"];

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

/**
 * El dashboard está separado por tema: cada pestaña calcula solo lo suyo, así
 * ninguna carga datos de las otras y cada una se lee sin ruido.
 */
export default async function DashboardPage(props: PageProps<"/admin/dashboard">) {
  await requireAdmin();
  const searchParams = await props.searchParams;

  const requested = typeof searchParams?.vista === "string" ? searchParams.vista : "tareas";
  const vista: Vista = (VISTAS as string[]).includes(requested) ? (requested as Vista) : "tareas";
  const range = typeof searchParams?.range === "string" ? searchParams.range : "all";
  const categoryId = typeof searchParams?.categoryId === "string" ? searchParams.categoryId : undefined;

  // Los filtros de tickets se conservan al cambiar de pestaña.
  const keep = new URLSearchParams();
  if (typeof searchParams?.range === "string") keep.set("range", searchParams.range);
  if (typeof searchParams?.categoryId === "string") keep.set("categoryId", searchParams.categoryId);
  const tabHref = (v: Vista) => {
    const params = new URLSearchParams(keep);
    params.set("vista", v);
    return `/admin/dashboard?${params.toString()}`;
  };

  const pendingRequests = await db.request.count({ where: { status: "PENDING" } });

  const tabs: PageTab[] = [
    { key: "tareas", label: "Tareas", href: tabHref("tareas") },
    { key: "mantenimiento", label: "Mantenimiento", href: tabHref("mantenimiento") },
    { key: "licencias", label: "Licencias", href: tabHref("licencias") },
    { key: "equipos", label: "Equipos", href: tabHref("equipos") },
    {
      key: "gastos",
      label: "Gastos",
      href: tabHref("gastos"),
      badge:
        pendingRequests > 0
          ? { text: `${pendingRequests} por aprobar`, tone: "warning" }
          : undefined,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageTabs tabs={tabs} active={vista} />

      {vista === "tareas" && <TareasTab range={range} categoryId={categoryId} />}
      {vista === "mantenimiento" && <MantenimientoTab range={range} />}
      {vista === "licencias" && <LicenciasTab />}
      {vista === "equipos" && <EquiposTab range={range} />}
      {vista === "gastos" && (
        <GastosTab
          gasto={searchParams?.gasto}
          periodo={searchParams?.periodo}
          keep={keep}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Tareas

async function TareasTab({ range, categoryId }: { range: string; categoryId?: string }) {
  const filters: StatsFilters = { categoryId, from: rangeToFromDate(range) };

  const [
    kpis,
    snapshot,
    byCategory,
    byPriority,
    resolutionByCategory,
    activity,
    oldestOpenHours,
    categories,
    escalations,
  ] =
    await Promise.all([
      getKpis(filters),
      getOpenSnapshot(categoryId),
      getTicketsByCategory(filters),
      getTicketsByPriority(filters),
      getResolutionTimeByCategory(filters),
      getWeeklyActivity(filters),
      getOldestOpenTicketAgeHours(),
      db.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
      getEscalationSnapshot(),
    ]);

  const resolutionRate = kpis.total > 0 ? Math.round((kpis.completed / kpis.total) * 100) : null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-end gap-3">
        <DashboardFilters categories={categories} />
      </div>

      <SectionTitle hint="sin importar el período elegido">Situación ahora</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Tickets abiertos" value={String(snapshot.open)} />
        <KpiCard label="Urgentes sin resolver" value={String(snapshot.urgent)} />
        <KpiCard label="Sin clasificar" value={String(snapshot.untriaged)} />
        <KpiCard label="Espera del más viejo" value={formatHours(oldestOpenHours)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Esperando a proveedores" value={String(escalations.open)} />
        <KpiCard label="Espera más larga con un proveedor" value={formatHours(escalations.oldestHours)} />
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

      <SectionTitle>Tendencias</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <TicketActivityChart data={activity} />
        <TicketsByPriorityChart data={byPriority} />
        <TicketsByCategoryChart data={byCategory} />
        <ResolutionTimeChart data={resolutionByCategory} />
      </div>
    </>
  );
}

// ------------------------------------------------------------------ Mantenimiento

async function MantenimientoTab({ range }: { range: string }) {
  const filters: StatsFilters = { from: rangeToFromDate(range) };

  const [tasks, done, trend] = await Promise.all([
    db.maintenanceTask.findMany({
      include: { _count: { select: { completions: { where: { kind: "DONE" } } } } },
    }),
    getMaintenanceCompletionCount(filters),
    getMaintenanceWeeklyTrend(filters),
  ]);

  const rows = tasks.map((task) => toMaintenanceRow(task, task._count.completions));
  const count = (status: string) => rows.filter((r) => r.status === status).length;
  const overdue = rows
    .filter((r) => r.status === "OVERDUE")
    .sort((a, b) => a.nextDueAt.getTime() - b.nextDueAt.getTime())
    .slice(0, 6);

  return (
    <>
      <div className="flex flex-wrap items-end justify-end gap-3">
        <DashboardFilters categories={[]} showCategory={false} />
      </div>

      <SectionTitle hint="sin importar el período elegido">Situación ahora</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Vencidas" value={String(count("OVERDUE"))} />
        <KpiCard label="Vencen pronto" value={String(count("DUE_SOON"))} />
        <KpiCard label="Al día" value={String(count("OK"))} />
        <KpiCard label="Tareas periódicas" value={String(rows.length)} />
      </div>

      <SectionTitle hint="según el período del filtro">Actividad</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Mantenimientos hechos" value={String(done)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <MaintenanceTrendChart data={trend} />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-ink">Las más atrasadas</CardTitle>
            <p className="text-xs text-slate-400">tareas vencidas, empezando por la que lleva más tiempo</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {overdue.length === 0 ? (
              <p className="text-sm text-ink-muted">No hay tareas vencidas. Todo está al día.</p>
            ) : (
              overdue.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <span className="min-w-0 truncate text-sm text-ink">{task.title}</span>
                  <span className="shrink-0 text-xs font-medium text-[#991B1B]">
                    venció hace {formatDistanceToNow(task.nextDueAt, { locale: es })}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ Licencias

async function LicenciasTab() {
  const licenses = await db.license.findMany({ where: { status: "ACTIVE" } });

  const licenseList = licenses.filter((l) => groupOfKind(l.kind) === "LICENSE");
  const serviceList = licenses.filter((l) => groupOfKind(l.kind) === "SERVICE");
  const alerts = licenses.map((l) => ({ license: l, alert: getLicenseAlert(l) }));
  const expired = alerts.filter((a) => a.alert === "EXPIRED").length;
  const expiring = alerts.filter((a) => a.alert === "EXPIRING").length;
  const autoRenew = licenses.filter((l) => l.autoRenew).length;

  // Qué tan usados están los puestos pagos. Las suscripciones abiertas no tienen puestos.
  const withSeats = licenseList.filter((l) => hasSeats(l.pricing));
  const seatsPaid = withSeats.reduce((sum, l) => sum + l.seatsTotal, 0);
  const seatsUsed = withSeats.reduce((sum, l) => sum + Math.min(l.seatsAssigned, l.seatsTotal), 0);
  const utilization = seatsPaid > 0 ? Math.round((seatsUsed / seatsPaid) * 100) : null;

  // Lo próximo que vence, lo ya vencido primero.
  const upcoming = alerts
    .filter((a) => a.license.expiresAt)
    .sort((a, b) => a.license.expiresAt!.getTime() - b.license.expiresAt!.getTime())
    .slice(0, 8);

  return (
    <>
      <SectionTitle>Estado</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Licencias activas" value={String(licenseList.length)} />
        <KpiCard label="Servicios activos" value={String(serviceList.length)} />
        <KpiCard label="Por vencer" value={String(expiring)} />
        <KpiCard label="Vencidas" value={String(expired)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Se renuevan solas" value={String(autoRenew)} />
        <KpiCard
          label="Puestos en uso"
          value={utilization == null ? "—" : `${utilization}%`}
        />
        <KpiCard label="Puestos pagos" value={String(seatsPaid)} />
        <KpiCard label="Puestos usados" value={String(seatsUsed)} />
      </div>

      <SectionTitle hint="lo vencido primero">Próximos vencimientos</SectionTitle>
      <Card className="py-0">
        <CardContent className="p-0">
          {upcoming.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">
              Ninguna licencia ni servicio tiene fecha de vencimiento cargada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="w-32">Tipo</TableHead>
                  <TableHead className="w-36">Vence</TableHead>
                  <TableHead className="w-44">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.map(({ license, alert }) => (
                  <TableRow key={license.id}>
                    <TableCell className="text-ink">{license.name}</TableCell>
                    <TableCell className="text-ink-muted">{KIND_SHORT[license.kind]}</TableCell>
                    <TableCell className="text-ink-muted">
                      {license.expiresAt!.toLocaleDateString("es-AR", { timeZone: "UTC" })}
                    </TableCell>
                    <TableCell className={ALERT_META[alert].className}>
                      {ALERT_META[alert].label}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ------------------------------------------------------------------ Equipos

async function EquiposTab({ range }: { range: string }) {
  const [assets, byAsset] = await Promise.all([
    db.asset.findMany({
      select: { type: true, status: true, os: true, warrantyUntil: true },
    }),
    getTicketsByAsset({ from: rangeToFromDate(range) }),
  ]);

  const count = (status: string) => assets.filter((a) => a.status === status).length;
  const warrantyExpiring = assets.filter((a) => getWarrantyState(a.warrantyUntil) === "EXPIRING").length;

  const withSoftware = assets.filter((a) => hasSoftware(a.type));
  const unsupported = withSoftware.filter((a) => getSupportState(a.os, OS_CATALOG) === "ENDED").length;

  const osCounts = withSoftware.reduce<Record<string, number>>((acc, a) => {
    const key = a.os ?? "Sin dato";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const osData: OsCount[] = Object.entries(osCounts)
    .map(([os, n]) => ({ os, count: n, ended: getSupportState(os, OS_CATALOG) === "ENDED" }))
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <div className="flex flex-wrap items-end justify-end gap-3">
        <DashboardFilters categories={[]} showCategory={false} />
      </div>

      <SectionTitle>Inventario</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Equipos" value={String(assets.length)} />
        <KpiCard label="En uso" value={String(count("ACTIVE"))} />
        <KpiCard label="En reparación" value={String(count("REPAIR"))} />
        <KpiCard label="En inventario" value={String(count("STOCK"))} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Garantías por vencer" value={String(warrantyExpiring)} />
        <KpiCard label="Con sistema sin soporte" value={String(unsupported)} />
      </div>

      <SectionTitle hint="los tickets según el período del filtro">Tendencias</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <AssetsByOsChart data={osData} />
        <TicketsByAssetChart data={byAsset} />
      </div>
    </>
  );
}

// ------------------------------------------------------------------ Gastos

async function GastosTab({
  gasto,
  periodo,
  keep,
}: {
  gasto: string | string[] | undefined;
  periodo: string | string[] | undefined;
  keep: URLSearchParams;
}) {
  const [licenses, approved, pending] = await Promise.all([
    db.license.findMany({ where: { status: "ACTIVE" } }),
    // Todo pedido aprobado con costo es gasto: mejoras, cambios por rotura, reemplazos y compras.
    db.request.findMany({
      where: { kind: { not: "RETIRE" }, status: "APPROVED", costCents: { not: null } },
      select: { id: true, kind: true, title: true, targetLabel: true, costCents: true, currency: true, decidedAt: true },
    }),
    db.request.findMany({
      where: { kind: { not: "RETIRE" }, status: "PENDING" },
      select: { estimatedCostCents: true, currency: true },
    }),
  ]);

  const mode: ExpenseMode = gasto === "anio" ? "anio" : "mes";
  const period = resolvePeriod(mode, typeof periodo === "string" ? periodo : undefined);
  const summary = summarizeExpenses(licenses, approved, period.from, period.to);
  const series = period.mode === "anio" ? monthlySeries(licenses, approved, Number(period.key)) : undefined;

  // Plata que se va por puestos pagos que nadie usa, por año y por moneda.
  const wastedByCurrency = licenses.reduce<Record<string, number>>((acc, l) => {
    acc[l.currency] = (acc[l.currency] ?? 0) + annualWastedCents(l);
    return acc;
  }, {});
  const wastedRows = Object.keys(wastedByCurrency)
    .sort()
    .map((currency) => ({ currency, cents: wastedByCurrency[currency] }));

  // Lo que está pedido y todavía no se aprobó: es plata que puede venir.
  const pendingByCurrency = pending.reduce<Record<string, number>>((acc, r) => {
    if (r.estimatedCostCents) acc[r.currency] = (acc[r.currency] ?? 0) + r.estimatedCostCents;
    return acc;
  }, {});
  const pendingRows = Object.keys(pendingByCurrency)
    .sort()
    .map((currency) => ({ currency, cents: pendingByCurrency[currency] }));

  // Los links del resumen conservan los filtros que ya estén elegidos.
  const expenseHref = (m: ExpenseMode, key: string) => {
    const params = new URLSearchParams(keep);
    params.set("vista", "gastos");
    params.set("gasto", m);
    params.set("periodo", key);
    return `/admin/dashboard?${params.toString()}`;
  };
  const currentMonthKey = resolvePeriod("mes", undefined).key;
  const hrefs = {
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

  return (
    <ExpensesSummary
      period={period}
      summary={summary}
      series={series}
      wastedRows={wastedRows}
      hrefs={hrefs}
      calendar={<PaymentCalendar months={getPaymentCalendar(licenses, 12)} />}
      extraCards={
        <MoneyCard
          title="Pendiente de aprobar"
          subtitle={`${pending.length} solicitud${pending.length === 1 ? "" : "es"} · estimado`}
          rows={pendingRows}
        />
      }
    />
  );
}
