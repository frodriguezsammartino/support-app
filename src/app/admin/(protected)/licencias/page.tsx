import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";
import { getRole } from "@/lib/adminAuth";
import {
  annualCostCents,
  annualWastedCents,
  getLicenseAlert,
  getPaymentCalendar,
  groupOfKind,
  KIND_ORDER,
  type LicenseGroup,
} from "@/lib/licenses";
import { OS_CATALOG, getSupportState } from "@/lib/os";
import { EXPENSE_WINDOW_MONTHS } from "@/lib/requests";
import { getPendingRetireIds } from "@/lib/pendingRetire";
import { CostByKind, type KindTotals } from "@/components/licenses/CostByKind";
import { LicenseWizard } from "@/components/licenses/LicenseWizard";
import { MoneyCard, StatusCard } from "@/components/licenses/LicensesSummary";
import { LicensesTable, type LicenseRow } from "@/components/licenses/LicensesTable";
import { MonthCardWithCalendar } from "@/components/licenses/MonthCardWithCalendar";
import { PaymentCalendar } from "@/components/licenses/PaymentCalendar";
import { UpgradeExpenses, type UpgradeExpenseRow } from "@/components/licenses/UpgradeExpenses";
import { PageTabs, type PageTab } from "@/components/ui/page-tabs";

type Vista = "licencias" | "servicios" | "gastos";

type LicenseRecord = Awaited<ReturnType<typeof db.license.findMany>>[number];

/** Cuántas hay activas, por vencer y vencidas dentro de un grupo. */
function statusOf(list: LicenseRecord[]) {
  const active = list.filter((l) => l.status === "ACTIVE");
  return {
    active: active.length,
    expired: active.filter((l) => getLicenseAlert(l) === "EXPIRED").length,
    expiring: active.filter((l) => getLicenseAlert(l) === "EXPIRING").length,
  };
}

/** El aviso que se ve desde otra pestaña: lo vencido pesa más que lo por vencer. */
function badgeOf(s: ReturnType<typeof statusOf>): PageTab["badge"] {
  if (s.expired > 0) return { text: `${s.expired} vencida${s.expired === 1 ? "" : "s"}`, tone: "danger" };
  if (s.expiring > 0) return { text: `${s.expiring} por vencer`, tone: "warning" };
  return undefined;
}

export default async function LicenciasPage(props: PageProps<"/admin/licencias">) {
  const role = await getRole();
  const isAdmin = role === "ADMIN";

  // Gastos es solo del admin: si el técnico llega con la dirección, ve Licencias.
  const searchParams = await props.searchParams;
  const requested = typeof searchParams?.vista === "string" ? searchParams.vista : "licencias";
  const vista: Vista =
    requested === "servicios" ? "servicios" : requested === "gastos" && isAdmin ? "gastos" : "licencias";

  // Ventana del gasto de mejoras: los aprobados de los últimos 12 meses y los pendientes.
  const expenseSince = new Date();
  expenseSince.setMonth(expenseSince.getMonth() - EXPENSE_WINDOW_MONTHS);

  // Cada pestaña trae solo lo que muestra.
  const [licenses, pendingRetire, softwareAssets, upgrades] = await Promise.all([
    db.license.findMany({ orderBy: { code: "asc" } }),
    getPendingRetireIds(),
    vista === "licencias"
      ? db.asset.findMany({
          where: { type: { in: ["PC", "NOTEBOOK", "SERVER"] } },
          select: { os: true },
        })
      : Promise.resolve([]),
    vista === "gastos"
      ? db.request.findMany({
          where: {
            kind: "UPGRADE",
            OR: [{ status: "PENDING" }, { status: "APPROVED", decidedAt: { gte: expenseSince } }],
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  // Al técnico no le llega plata: ni en la pantalla ni en los datos de la página.
  const rows: LicenseRow[] = licenses.map((l) => ({
    id: l.id,
    code: l.code,
    name: l.name,
    kind: l.kind,
    vendor: l.vendor,
    seatsTotal: l.seatsTotal,
    seatsAssigned: l.seatsAssigned,
    costCents: isAdmin ? l.costCents : null,
    currency: l.currency,
    billing: l.billing,
    pricing: l.pricing,
    expiresAt: l.expiresAt,
    autoRenew: l.autoRenew,
    status: l.status,
    notes: l.notes,
    url: l.url,
  }));

  const inGroup = (group: LicenseGroup) => licenses.filter((l) => groupOfKind(l.kind) === group);
  const rowsIn = (group: LicenseGroup) => rows.filter((r) => groupOfKind(r.kind) === group);
  const licenseStatus = statusOf(inGroup("LICENSE"));
  const serviceStatus = statusOf(inGroup("SERVICE"));

  const tabs: PageTab[] = [
    { key: "licencias", label: "Licencias", href: "/admin/licencias", badge: badgeOf(licenseStatus) },
    {
      key: "servicios",
      label: "Servicios",
      href: "/admin/licencias?vista=servicios",
      badge: badgeOf(serviceStatus),
    },
    ...(isAdmin ? [{ key: "gastos", label: "Gastos", href: "/admin/licencias?vista=gastos" }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageTabs tabs={tabs} active={vista} />

      {vista === "licencias" && (
        <LicensesView
          isAdmin={isAdmin}
          status={licenseStatus}
          licenses={inGroup("LICENSE")}
          rows={rowsIn("LICENSE")}
          retirePendingIds={pendingRetire.licenses}
          softwareOs={softwareAssets.map((a) => a.os)}
        />
      )}

      {vista === "servicios" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:max-w-3xl">
            <StatusCard title="Servicios" {...serviceStatus} />
          </div>
          <LicensesTable
            group="SERVICE"
            licenses={rowsIn("SERVICE")}
            retirePendingIds={pendingRetire.licenses}
            action={<LicenseWizard group="SERVICE" />}
          />
        </>
      )}

      {vista === "gastos" && isAdmin && <ExpensesView licenses={licenses} upgrades={upgrades} />}
    </div>
  );
}

/** Pestaña Licencias: el estado de los vencimientos y la tabla. */
function LicensesView({
  isAdmin,
  status,
  licenses,
  rows,
  retirePendingIds,
  softwareOs,
}: {
  isAdmin: boolean;
  status: ReturnType<typeof statusOf>;
  licenses: LicenseRecord[];
  rows: LicenseRow[];
  retirePendingIds: string[];
  softwareOs: (string | null)[];
}) {
  // Plata que se va por puestos pagos que nadie usa (solo se le muestra al admin).
  const active = licenses.filter((l) => l.status === "ACTIVE");
  const wastedByCurrency = active.reduce<Record<string, number>>((acc, l) => {
    acc[l.currency] = (acc[l.currency] ?? 0) + annualWastedCents(l);
    return acc;
  }, {});
  const wastedRows = Object.keys(wastedByCurrency)
    .sort()
    .map((currency) => ({ currency, cents: wastedByCurrency[currency] }));

  // El software instalado vive en Equipos; acá solo se avisa si hay algo que atender.
  const unsupported = softwareOs.filter((os) => getSupportState(os, OS_CATALOG) === "ENDED").length;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-3xl">
        <StatusCard title="Licencias" {...status} />
        {isAdmin && (
          <MoneyCard
            title="Se paga sin usar"
            subtitle="por año, solo licencias por puesto"
            rows={wastedRows}
            alert
          />
        )}
      </div>

      {unsupported > 0 && (
        <Link
          href="/admin/equipos?vista=software"
          className="flex items-start gap-2 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2.5 text-sm text-[#991B1B] transition-colors hover:bg-[#FEE2E2]"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="font-semibold">
              {unsupported} de {softwareOs.length} equipos tienen un sistema operativo sin soporte.
            </span>{" "}
            Ver el detalle en Equipos
          </span>
        </Link>
      )}

      <LicensesTable
        group="LICENSE"
        licenses={rows}
        retirePendingIds={retirePendingIds}
        action={<LicenseWizard group="LICENSE" />}
      />
    </>
  );
}

/** Pestaña Gastos (solo admin): todo lo que es plata, con el calendario en una ventana grande. */
function ExpensesView({
  licenses,
  upgrades,
}: {
  licenses: LicenseRecord[];
  upgrades: Awaited<ReturnType<typeof db.request.findMany>>;
}) {
  // Las dadas de baja no se cuentan: no se pagan ni se usan.
  const active = licenses.filter((l) => l.status === "ACTIVE");

  const calendar = getPaymentCalendar(active, 12);
  const thisMonth = calendar[0];

  const annualByCurrency = active.reduce<Record<string, number>>((acc, l) => {
    acc[l.currency] = (acc[l.currency] ?? 0) + annualCostCents(l);
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

  // Las monedas nunca se suman entre sí. Una puede aparecer solo en mejoras: se muestra igual.
  const currencies = Array.from(
    new Set([...active.map((l) => l.currency), ...Object.keys(upgradeTotals)])
  ).sort();
  const toRows = (totals: Record<string, number>) =>
    currencies.map((currency) => ({ currency, cents: totals[currency] ?? 0 }));

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MonthCardWithCalendar
          title="A pagar este mes"
          subtitle={thisMonth?.label ?? ""}
          rows={toRows(thisMonth?.totals ?? {})}
        >
          <PaymentCalendar months={calendar} />
        </MonthCardWithCalendar>
        <MoneyCard title="Gasto anual" subtitle="proyectado a 12 meses" rows={toRows(annualByCurrency)} />
        <MoneyCard
          title="Mejoras y repuestos"
          subtitle={`aprobados en los últimos ${EXPENSE_WINDOW_MONTHS} meses`}
          rows={toRows(upgradeTotals)}
        />
      </div>

      <CostByKind totals={annualByKind} currencies={currencies} upgrades={upgradeTotals} />
      <UpgradeExpenses rows={upgradeRows} totals={upgradeTotals} />
    </>
  );
}
