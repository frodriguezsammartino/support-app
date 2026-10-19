import { db } from "@/lib/db";
import {
  annualCostCents,
  annualWastedCents,
  getLicenseAlert,
  getPaymentCalendar,
  groupOfKind,
  KIND_ORDER,
  type LicenseKind,
} from "@/lib/licenses";
import { CostByKind, type KindTotals } from "@/components/licenses/CostByKind";
import { LicensesSummary } from "@/components/licenses/LicensesSummary";
import { LicensesTable, type LicenseRow } from "@/components/licenses/LicensesTable";
import { LicenseWizard } from "@/components/licenses/LicenseWizard";
import { OsInventory } from "@/components/licenses/OsInventory";
import { PaymentCalendar } from "@/components/licenses/PaymentCalendar";
import { hasSoftware } from "@/lib/os";

export default async function LicenciasPage() {
  const [licenses, assets] = await Promise.all([
    db.license.findMany({ orderBy: { code: "asc" } }),
    // El software instalado sale del inventario de equipos: no se carga dos veces.
    db.asset.findMany({
      where: { type: { in: ["PC", "NOTEBOOK", "SERVER"] } },
      select: { type: true, location: true, os: true, office: true },
    }),
  ]);
  const softwareAssets = assets.filter((a) => hasSoftware(a.type));

  const rows: LicenseRow[] = licenses.map((l) => ({
    id: l.id,
    code: l.code,
    name: l.name,
    kind: l.kind,
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
    url: l.url,
  }));

  // Dos tablas en la misma pantalla: licencias de software y servicios contratados.
  const licenseRows = rows.filter((r) => groupOfKind(r.kind) === "LICENSE");
  const serviceRows = rows.filter((r) => groupOfKind(r.kind) === "SERVICE");

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

  // Mismo gasto anual, abierto por tipo: licencias, servicios, soporte.
  const annualByKind = KIND_ORDER.reduce((acc, kind) => {
    acc[kind] = active
      .filter((l) => l.kind === kind)
      .reduce<Record<string, number>>((inner, l) => {
        inner[l.currency] = (inner[l.currency] ?? 0) + annualCostCents(l);
        return inner;
      }, {});
    return acc;
  }, {} as KindTotals);

  const toRows = (totals: Record<string, number>) =>
    currencies.map((currency) => ({ currency, cents: totals[currency] ?? 0 }));

  return (
    <div className="flex flex-col gap-4">
      <LicensesSummary
        active={active.length}
        expired={expired}
        expiring={expiring}
        monthRows={toRows(thisMonth?.totals ?? {})}
        monthLabel={thisMonth?.label ?? ""}
        annualRows={toRows(annualByCurrency)}
        wastedRows={toRows(wastedByCurrency)}
      />

      <LicensesTable
        group="LICENSE"
        licenses={licenseRows}
        action={<LicenseWizard group="LICENSE" />}
      />
      <LicensesTable
        group="SERVICE"
        licenses={serviceRows}
        action={<LicenseWizard group="SERVICE" />}
      />
      <CostByKind totals={annualByKind} currencies={currencies} />
      <PaymentCalendar months={calendar} />
      <OsInventory assets={softwareAssets} />
    </div>
  );
}
