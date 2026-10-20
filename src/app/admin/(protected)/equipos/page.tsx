import { db } from "@/lib/db";
import { getWarrantyState } from "@/lib/assets";
import { OS_CATALOG, getSupportState, hasSoftware } from "@/lib/os";
import { AssetsTable, type AssetRow } from "@/components/assets/AssetsTable";
import { NewAssetDialog } from "@/components/assets/NewAssetDialog";
import { SoftwareInventory } from "@/components/assets/SoftwareInventory";
import { KpiCard } from "@/components/charts/KpiCard";
import { PageTabs, type PageTab } from "@/components/ui/page-tabs";
import { getPendingRetireIds } from "@/lib/pendingRetire";

export default async function EquiposPage(props: PageProps<"/admin/equipos">) {
  const searchParams = await props.searchParams;
  const vista = searchParams?.vista === "software" ? "software" : "inventario";
  // Desde el detalle de software se llega con ?os=Windows 7 Pro ya elegido.
  const initialOs = typeof searchParams?.os === "string" ? searchParams.os : "ALL";
  const initialOffice = typeof searchParams?.office === "string" ? searchParams.office : "ALL";

  const [assets, pendingRetire] = await Promise.all([
    db.asset.findMany({
      orderBy: { code: "asc" },
      include: {
        tickets: { select: { status: true } },
      },
    }),
    getPendingRetireIds(),
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

  const tabs: PageTab[] = [
    { key: "inventario", label: "Inventario", href: "/admin/equipos" },
    {
      key: "software",
      label: "Software instalado",
      href: "/admin/equipos?vista=software",
      badge: unsupported > 0 ? { text: `${unsupported} sin soporte`, tone: "danger" } : undefined,
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

      {vista === "inventario" ? (
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
          />
        </>
      ) : (
        <SoftwareInventory
          assets={softwareAssets.map((a) => ({ location: a.location, os: a.os, office: a.office }))}
        />
      )}
    </div>
  );
}
