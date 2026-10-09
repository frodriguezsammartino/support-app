import { db } from "@/lib/db";
import {
  annualCostCents,
  annualWastedCents,
  getLicenseAlert,
  getPaymentCalendar,
} from "@/lib/licenses";
import { LicensesSummary } from "@/components/licenses/LicensesSummary";
import { LicensesTable, type LicenseRow } from "@/components/licenses/LicensesTable";
import { NewLicenseDialog } from "@/components/licenses/NewLicenseDialog";
import { PaymentCalendar } from "@/components/licenses/PaymentCalendar";

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
    pricing: l.pricing,
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

  // Las monedas nunca se suman entre sí: cada una lleva su propio renglón.
  const currencies = Array.from(new Set(active.map((l) => l.currency))).sort();

  const annualByCurrency = active.reduce<Record<string, number>>((acc, l) => {
    acc[l.currency] = (acc[l.currency] ?? 0) + annualCostCents(l);
    return acc;
  }, {});

  // Plata que se va por puestos pagos que nadie usa.
  const wastedByCurrency = active.reduce<Record<string, number>>((acc, l) => {
    acc[l.currency] = (acc[l.currency] ?? 0) + annualWastedCents(l);
    return acc;
  }, {});

  const toRows = (totals: Record<string, number>) =>
    currencies.map((currency) => ({ currency, cents: totals[currency] ?? 0 }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <NewLicenseDialog />
      </div>

      <LicensesSummary
        active={active.length}
        expired={expired}
        expiring={expiring}
        monthRows={toRows(thisMonth?.totals ?? {})}
        monthLabel={thisMonth?.label ?? ""}
        annualRows={toRows(annualByCurrency)}
        wastedRows={toRows(wastedByCurrency)}
      />

      <LicensesTable licenses={rows} />
      <PaymentCalendar months={calendar} />
    </div>
  );
}
