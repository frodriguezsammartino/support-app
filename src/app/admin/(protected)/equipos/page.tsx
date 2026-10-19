import { db } from "@/lib/db";
import { getWarrantyState } from "@/lib/assets";
import { AssetsTable, type AssetRow } from "@/components/assets/AssetsTable";
import { NewAssetDialog } from "@/components/assets/NewAssetDialog";
import { KpiCard } from "@/components/charts/KpiCard";

export default async function EquiposPage(props: PageProps<"/admin/equipos">) {
  const searchParams = await props.searchParams;
  // Se llega desde el panel de licencias con ?os=Windows 7 Pro ya elegido.
  const initialOs = typeof searchParams?.os === "string" ? searchParams.os : "ALL";
  const initialOffice = typeof searchParams?.office === "string" ? searchParams.office : "ALL";

  const assets = await db.asset.findMany({
    orderBy: { code: "asc" },
    include: {
      tickets: { select: { status: true } },
    },
  });

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <NewAssetDialog />
      </div>

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
      />
    </div>
  );
}
