import { db } from "@/lib/db";
import { getRole } from "@/lib/adminAuth";
import { getWarrantyState } from "@/lib/assets";
import { OS_CATALOG, getSupportState, hasSoftware } from "@/lib/os";
import { EXPENSE_WINDOW_MONTHS } from "@/lib/requests";
import { AssetsTable, type AssetRow } from "@/components/assets/AssetsTable";
import { NewAssetDialog } from "@/components/assets/NewAssetDialog";
import { SoftwareInventory } from "@/components/assets/SoftwareInventory";
import { UpgradeExpenses, type UpgradeExpenseRow } from "@/components/assets/UpgradeExpenses";
import { KpiCard } from "@/components/charts/KpiCard";
import { PageTabs, type PageTab } from "@/components/ui/page-tabs";
import { getPendingRetireIds } from "@/lib/pendingRetire";

type Vista = "inventario" | "software" | "mejoras";

/** Los pedidos que tocan equipos; las compras sueltas y las bajas se ven en Solicitudes. */
const EQUIPMENT_KINDS = ["UPGRADE", "CHANGE", "REPLACE"] as const;

export default async function EquiposPage(props: PageProps<"/admin/equipos">) {
  const isAdmin = (await getRole()) === "ADMIN";
  const searchParams = await props.searchParams;
  const vista: Vista =
    searchParams?.vista === "software" ? "software" : searchParams?.vista === "mejoras" ? "mejoras" : "inventario";
  // Desde el detalle de software se llega con ?os=Windows 7 Pro ya elegido.
  const initialOs = typeof searchParams?.os === "string" ? searchParams.os : "ALL";
  const initialOffice = typeof searchParams?.office === "string" ? searchParams.office : "ALL";

  // Ventana de las mejoras: las aprobadas de los últimos 12 meses y las pendientes.
  const since = new Date();
  since.setMonth(since.getMonth() - EXPENSE_WINDOW_MONTHS);

  const [assets, pendingRetire, pendingUpgrades, upgrades, categories, unassignedTickets] = await Promise.all([
    db.asset.findMany({
      orderBy: { code: "asc" },
      include: {
        tickets: { select: { status: true } },
      },
    }),
    getPendingRetireIds(),
    db.request.count({ where: { kind: { in: [...EQUIPMENT_KINDS] }, status: "PENDING" } }),
    vista === "mejoras"
      ? db.request.findMany({
          where: {
            kind: { in: [...EQUIPMENT_KINDS] },
            OR: [{ status: "PENDING" }, { status: "APPROVED", decidedAt: { gte: since } }],
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    // Para ofrecer cargar el ticket cuando un equipo pasa a reparación desde la lista.
    vista === "inventario"
      ? db.category.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })
      : Promise.resolve([]),
    vista === "inventario"
      ? db.ticket.findMany({
          where: { status: { in: ["BACKLOG", "IN_PROGRESS"] }, assetId: null },
          select: { id: true, number: true, title: true },
          orderBy: { number: "desc" },
          take: 50,
        })
      : Promise.resolve([]),
  ]);

  const rows: AssetRow[] = assets.map((asset) => ({
    id: asset.id,
    code: asset.code,
    name: asset.name,
    type: asset.type,
    status: asset.status,
    brand: asset.brand,
    model: asset.model,
    location: asset.location,
    owner: asset.owner,
    os: asset.os,
    office: asset.office,
    warrantyUntil: asset.warrantyUntil,
    openTickets: asset.tickets.filter((t) => t.status !== "COMPLETED").length,
    totalTickets: asset.tickets.length,
  }));

  const inUse = rows.filter((a) => a.status === "ACTIVE").length;
  const inRepair = rows.filter((a) => a.status === "REPAIR").length;
  const inStock = rows.filter((a) => a.status === "STOCK").length;
  const warrantyExpiring = assets.filter(
    (a) => getWarrantyState(a.warrantyUntil) === "EXPIRING"
  ).length;

  // El software instalado se cuenta desde el inventario: es un dato de cada equipo.
  const softwareAssets = assets.filter((a) => hasSoftware(a.type));
  const unsupported = softwareAssets.filter(
    (a) => getSupportState(a.os, OS_CATALOG) === "ENDED"
  ).length;

  // Mejoras: al técnico no le llegan montos (ni en la pantalla ni en los datos).
  const upgradeRows: UpgradeExpenseRow[] = upgrades.map((r) => ({
    id: r.id,
    number: r.number,
    kind: r.kind,
    assetId: r.assetId,
    targetLabel: r.targetLabel,
    title: r.title,
    component: r.component,
    requestedBy: r.requestedBy,
    status: r.status === "APPROVED" ? "APPROVED" : "PENDING",
    costCents: isAdmin ? r.costCents : null,
    estimatedCostCents: isAdmin ? r.estimatedCostCents : null,
    currency: r.currency,
    at: r.status === "APPROVED" ? (r.decidedAt ?? r.createdAt) : r.createdAt,
  }));
  const upgradeTotals = upgradeRows
    .filter((r) => r.status === "APPROVED" && r.costCents)
    .reduce<Record<string, number>>((acc, r) => {
      acc[r.currency] = (acc[r.currency] ?? 0) + (r.costCents ?? 0);
      return acc;
    }, {});

  const tabs: PageTab[] = [
    { key: "inventario", label: "Inventario", href: "/admin/equipos" },
    {
      key: "software",
      label: "Software instalado",
      href: "/admin/equipos?vista=software",
      badge: unsupported > 0 ? { text: `${unsupported} sin soporte`, tone: "danger" } : undefined,
    },
    {
      key: "mejoras",
      label: "Mejoras y repuestos",
      href: "/admin/equipos?vista=mejoras",
      badge: pendingUpgrades > 0 ? { text: `${pendingUpgrades} pendiente${pendingUpgrades === 1 ? "" : "s"}`, tone: "warning" } : undefined,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <PageTabs tabs={tabs} active={vista} />
        </div>
        {vista === "inventario" && <NewAssetDialog />}
      </div>

      {vista === "inventario" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard label="Equipos" value={String(rows.length)} />
            <KpiCard label="En uso" value={String(inUse)} />
            <KpiCard label="En inventario" value={String(inStock)} />
            <KpiCard label="En reparación" value={String(inRepair)} />
            <KpiCard label="Garantías por vencer" value={String(warrantyExpiring)} />
          </div>

          <AssetsTable
            key={`${initialOs}|${initialOffice}`}
            assets={rows}
            initialOs={initialOs}
            initialOffice={initialOffice}
            retirePendingIds={pendingRetire.assets}
            categories={categories}
            unassignedTickets={unassignedTickets}
          />
        </>
      )}

      {vista === "software" && (
        <SoftwareInventory
          assets={softwareAssets.map((a) => ({ location: a.location, os: a.os, office: a.office }))}
        />
      )}

      {vista === "mejoras" && (
        <UpgradeExpenses rows={upgradeRows} totals={upgradeTotals} showMoney={isAdmin} />
      )}
    </div>
  );
}
