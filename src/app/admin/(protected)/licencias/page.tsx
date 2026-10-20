import { db } from "@/lib/db";
import { getRole } from "@/lib/adminAuth";
import {
  annualCostCents,
  annualWastedCents,
  getLicenseAlert,
  getPaymentCalendar,
  groupOfKind,
  type LicenseGroup,
} from "@/lib/licenses";
import { getPendingRetireIds } from "@/lib/pendingRetire";
import { MoneyCard, type MoneyRow } from "@/components/charts/MoneyCard";
import { LicenseWizard } from "@/components/licenses/LicenseWizard";
import { LicensesTable, type LicenseRow } from "@/components/licenses/LicensesTable";
import { PaymentCalendar } from "@/components/licenses/PaymentCalendar";
import { PaymentCalendarDialog } from "@/components/licenses/PaymentCalendarDialog";
import { StatusCard } from "@/components/licenses/StatusCard";
import { PageTabs, type PageTab } from "@/components/ui/page-tabs";

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

/** El aviso que se ve desde la otra pestaña: lo vencido pesa más que lo por vencer. */
function badgeOf(s: ReturnType<typeof statusOf>): PageTab["badge"] {
  if (s.expired > 0) return { text: `${s.expired} vencida${s.expired === 1 ? "" : "s"}`, tone: "danger" };
  if (s.expiring > 0) return { text: `${s.expiring} por vencer`, tone: "warning" };
  return undefined;
}

/** Un monto por moneda: las monedas nunca se suman entre sí. */
function toRows(totals: Record<string, number>, currencies: string[]): MoneyRow[] {
  return currencies.map((currency) => ({ currency, cents: totals[currency] ?? 0 }));
}

/**
 * Licencias y servicios, cada uno en su pestaña con su propio resumen. El resumen
 * de plata es solo del administrador; el técnico ve los vencimientos.
 */
export default async function LicenciasPage(props: PageProps<"/admin/licencias">) {
  const role = await getRole();
  const isAdmin = role === "ADMIN";

  const searchParams = await props.searchParams;
  const group: LicenseGroup = searchParams?.vista === "servicios" ? "SERVICE" : "LICENSE";

  const [licenses, pendingRetire] = await Promise.all([
    db.license.findMany({ orderBy: { code: "asc" } }),
    getPendingRetireIds(),
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

  const inGroup = (g: LicenseGroup) => licenses.filter((l) => groupOfKind(l.kind) === g);

  const tabs: PageTab[] = [
    {
      key: "LICENSE",
      label: "Licencias",
      href: "/admin/licencias",
      badge: badgeOf(statusOf(inGroup("LICENSE"))),
    },
    {
      key: "SERVICE",
      label: "Servicios",
      href: "/admin/licencias?vista=servicios",
      badge: badgeOf(statusOf(inGroup("SERVICE"))),
    },
  ];

  // El resumen y el calendario son de la pestaña elegida, no de todo junto.
  const mine = inGroup(group);
  const status = statusOf(mine);
  const active = mine.filter((l) => l.status === "ACTIVE");

  let money: React.ReactNode = null;
  if (isAdmin) {
    const currencies = Array.from(new Set(active.map((l) => l.currency))).sort();
    const thisMonth = getPaymentCalendar(active, 1)[0];
    const sumBy = (fn: (l: LicenseRecord) => number) =>
      active.reduce<Record<string, number>>((acc, l) => {
        acc[l.currency] = (acc[l.currency] ?? 0) + fn(l);
        return acc;
      }, {});

    money = (
      <>
        <MoneyCard
          title="Costo mensual"
          subtitle={`lo que se paga en ${thisMonth?.label ?? "este mes"}`}
          rows={toRows(thisMonth?.totals ?? {}, currencies)}
        />
        <MoneyCard
          title="Costo anual"
          subtitle="proyectado a 12 meses"
          rows={toRows(sumBy(annualCostCents), currencies)}
        />
        {/* Solo las licencias por puesto pueden tener puestos pagos sin usar. */}
        {group === "LICENSE" && (
          <MoneyCard
            title="Se paga sin usar"
            subtitle="por año, puestos que nadie usa"
            rows={toRows(sumBy(annualWastedCents), currencies)}
            alert
          />
        )}
      </>
    );
  }

  // El calendario solo se arma para el admin, que es quien lo puede abrir.
  const calendar = isAdmin ? getPaymentCalendar(active, 12) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <PageTabs tabs={tabs} active={group} />
        </div>
        {calendar && (
          <PaymentCalendarDialog>
            <PaymentCalendar months={calendar} />
          </PaymentCalendarDialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard title={group === "LICENSE" ? "Licencias" : "Servicios"} {...status} />
        {money}
      </div>

      <LicensesTable
        group={group}
        licenses={rows.filter((r) => groupOfKind(r.kind) === group)}
        retirePendingIds={pendingRetire.licenses}
        action={<LicenseWizard group={group} />}
      />
    </div>
  );
}
