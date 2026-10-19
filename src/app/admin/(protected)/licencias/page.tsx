import { db } from "@/lib/db";
import {
  annualCostCents,
  annualWastedCents,
  getLicenseAlert,
  getPaymentCalendar,
  groupOfKind,
  KIND_ORDER,
} from "@/lib/licenses";
import { CostByKind, type KindTotals } from "@/components/licenses/CostByKind";
import { LicensesSummary } from "@/components/licenses/LicensesSummary";
import { LicensesTable, type LicenseRow } from "@/components/licenses/LicensesTable";
import { LicenseWizard } from "@/components/licenses/LicenseWizard";
import { OsInventory } from "@/components/licenses/OsInventory";
import { PaymentCalendar } from "@/components/licenses/PaymentCalendar";
import { hasSoftware } from "@/lib/os";
import { EXPENSE_WINDOW_MONTHS } from "@/lib/requests";
import { UpgradeExpenses, type UpgradeExpenseRow } from "@/components/licenses/UpgradeExpenses";
import { getPendingRetireIds } from "@/lib/pendingRetire";

export default async function LicenciasPage() {
  // Ventana del gasto de mejoras: los aprobados de los últimos 12 meses y los pendientes.
  const expenseSince = new Date();
  expenseSince.setMonth(expenseSince.getMonth() - EXPENSE_WINDOW_MONTHS);

  const [licenses, upgrades, assets, pendingRetire] = await Promise.all([
    db.license.findMany({ orderBy: { code: "asc" } }),
    db.request.findMany({
      where: {
        kind: "UPGRADE",
        OR: [{ status: "PENDING" }, { status: "APPROVED", decidedAt: { gte: expenseSince } }],
      },
      orderBy: { createdAt: "desc" },
    }),
    // El software instalado sale del inventario de equipos: no se carga dos veces.
    db.asset.findMany({
      where: { type: { in: ["PC", "NOTEBOOK", "SERVER"] } },
      select: { type: true, location: true, os: true, office: true },
    }),
    getPendingRetireIds(),
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

  // Mejoras y repuestos: lo aprobado suma por moneda; lo pendiente se muestra pero no suma.
  const upgradeRows: UpgradeExpenseRow[] = upgrades.map((r) => ({
    id: r.id,
    number: r.number,
    assetId: r.assetId,
    targetLabel: r.targetLabel,
    title: r.title,
    component: r.component,
    requestedBy: r.requestedBy,
    status: r.status === "APPROVED" ? "APPROVED" : "PENDING",
    costCents: r.costCents,
    estimatedCostCents: r.estimatedCostCents,
    currency: r.currency,
    at: r.status === "APPROVED" ? (r.decidedAt ?? r.createdAt) : r.createdAt,
  }));
  const upgradeTotals = upgradeRows
    .filter((r) => r.status === "APPROVED" && r.costCents)
    .reduce<Record<string, number>>((acc, r) => {
      acc[r.currency] = (acc[r.currency] ?? 0) + (r.costCents ?? 0);
      return acc;
    }, {});
  // Una moneda puede aparecer solo en mejoras: el desglose tiene que mostrarla igual.
  const costCurrencies = Array.from(new Set([...currencies, ...Object.keys(upgradeTotals)])).sort();

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
        retirePendingIds={pendingRetire.licenses}
        action={<LicenseWizard group="LICENSE" />}
      />
      <LicensesTable
        group="SERVICE"
        licenses={serviceRows}
        retirePendingIds={pendingRetire.licenses}
        action={<LicenseWizard group="SERVICE" />}
      />
      <UpgradeExpenses rows={upgradeRows} totals={upgradeTotals} />
      <CostByKind totals={annualByKind} currencies={costCurrencies} upgrades={upgradeTotals} />
      <PaymentCalendar months={calendar} />
      <OsInventory assets={softwareAssets} />
    </div>
  );
}
