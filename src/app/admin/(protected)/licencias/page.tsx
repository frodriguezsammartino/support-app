import { db } from "@/lib/db";
import { annualCostCents, formatMoney, getExpiryState } from "@/lib/licenses";
import { LicensesTable, type LicenseRow } from "@/components/licenses/LicensesTable";
import { NewLicenseDialog } from "@/components/licenses/NewLicenseDialog";
import { KpiCard } from "@/components/charts/KpiCard";

export default async function LicenciasPage() {
  const licenses = await db.license.findMany({ orderBy: { code: "asc" } });

  const rows: LicenseRow[] = licenses.map((l) => ({
    id: l.id,
    code: l.code,
    name: l.name,
    vendor: l.vendor,
    seatsTotal: l.seatsTotal,
    seatsAssigned: l.seatsAssigned,
    costCents: l.costCents,
    currency: l.currency,
    billing: l.billing,
    expiresAt: l.expiresAt,
    status: l.status,
    notes: l.notes,
  }));

  // Las dadas de baja no se cuentan: no se pagan ni se usan.
  const active = licenses.filter((l) => l.status === "ACTIVE");
  const seatsTotal = active.reduce((sum, l) => sum + l.seatsTotal, 0);
  const seatsAssigned = active.reduce((sum, l) => sum + l.seatsAssigned, 0);
  const expiringSoon = active.filter((l) => {
    const state = getExpiryState(l.expiresAt);
    return state === "EXPIRING" || state === "EXPIRED";
  }).length;

  // Los costos no se mezclan entre monedas: se muestra un total por cada una.
  const annualByCurrency = active.reduce<Record<string, number>>((acc, l) => {
    const cents = annualCostCents(l);
    if (cents > 0) acc[l.currency] = (acc[l.currency] ?? 0) + cents;
    return acc;
  }, {});
  const annualEntries = Object.entries(annualByCurrency);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <NewLicenseDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Licencias activas" value={String(active.length)} />
        <KpiCard label="Puestos contratados" value={String(seatsTotal)} />
        <KpiCard label="Puestos disponibles" value={String(seatsTotal - seatsAssigned)} />
        <KpiCard label="Vencidas o por vencer" value={String(expiringSoon)} />
      </div>

      {annualEntries.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {annualEntries.map(([currency, cents]) => (
            <KpiCard
              key={currency}
              label={`Gasto anual en ${currency}`}
              value={formatMoney(cents, currency)}
            />
          ))}
        </div>
      )}

      <LicensesTable licenses={rows} />
    </div>
  );
}
