import { db } from "@/lib/db";
import {
  annualCostCents,
  formatMoney,
  getLicenseAlert,
  getPaymentCalendar,
} from "@/lib/licenses";
import { LicensesTable, type LicenseRow } from "@/components/licenses/LicensesTable";
import { NewLicenseDialog } from "@/components/licenses/NewLicenseDialog";
import { PaymentCalendar } from "@/components/licenses/PaymentCalendar";
import { KpiCard } from "@/components/charts/KpiCard";

/** Junta los totales por moneda en un solo texto: "ARS 12.000 · USD 30,00". */
function joinByCurrency(totals: Record<string, number>) {
  const entries = Object.entries(totals).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return "—";
  return entries.map(([currency, cents]) => formatMoney(cents, currency)).join(" · ");
}

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
    autoRenew: l.autoRenew,
    status: l.status,
    notes: l.notes,
  }));

  // Las dadas de baja no se cuentan: no se pagan ni se usan.
  const active = licenses.filter((l) => l.status === "ACTIVE");
  const expired = active.filter((l) => getLicenseAlert(l) === "EXPIRED").length;
  const expiring = active.filter((l) => getLicenseAlert(l) === "EXPIRING").length;

  const calendar = getPaymentCalendar(active, 12);
  const thisMonth = calendar[0];

  // Los costos no se mezclan entre monedas: se muestra un total por cada una.
  const annualByCurrency = active.reduce<Record<string, number>>((acc, l) => {
    const cents = annualCostCents(l);
    if (cents > 0) acc[l.currency] = (acc[l.currency] ?? 0) + cents;
    return acc;
  }, {});
  const annualEntries = Object.entries(annualByCurrency).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <NewLicenseDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Licencias activas" value={String(active.length)} />
        <KpiCard label="Vencidas" value={String(expired)} />
        <KpiCard label="Por vencer" value={String(expiring)} />
        <KpiCard label="A pagar este mes" value={joinByCurrency(thisMonth?.totals ?? {})} />
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
      <PaymentCalendar months={calendar} />
    </div>
  );
}
