import { db } from "@/lib/db";
import { getRole } from "@/lib/adminAuth";
import { getLicenseAlert, getPaymentCalendar, groupOfKind, type LicenseGroup } from "@/lib/licenses";
import { getPendingRetireIds } from "@/lib/pendingRetire";
import { LicenseWizard } from "@/components/licenses/LicenseWizard";
import { LicensesTable, type LicenseRow } from "@/components/licenses/LicensesTable";
import { PaymentCalendar } from "@/components/licenses/PaymentCalendar";
import { PaymentCalendarDialog } from "@/components/licenses/PaymentCalendarDialog";
import { PageTabs, type PageTab } from "@/components/ui/page-tabs";

type LicenseRecord = Awaited<ReturnType<typeof db.license.findMany>>[number];

/** El aviso que se ve desde la otra pestaña: lo vencido pesa más que lo por vencer. */
function badgeOf(list: LicenseRecord[]): PageTab["badge"] {
  const active = list.filter((l) => l.status === "ACTIVE");
  const expired = active.filter((l) => getLicenseAlert(l) === "EXPIRED").length;
  const expiring = active.filter((l) => getLicenseAlert(l) === "EXPIRING").length;
  if (expired > 0) return { text: `${expired} vencida${expired === 1 ? "" : "s"}`, tone: "danger" };
  if (expiring > 0) return { text: `${expiring} por vencer`, tone: "warning" };
  return undefined;
}

/**
 * Solo licencias y servicios, cada uno en su pestaña. La plata (calendario de
 * pagos, resumen de gastos) no vive acá: el calendario se abre con un botón y el
 * resumen está en el dashboard.
 */
export default async function LicenciasPage(props: PageProps<"/admin/licencias">) {
  const role = await getRole();
  const isAdmin = role === "ADMIN";

  const searchParams = await props.searchParams;
  const vista: "licencias" | "servicios" = searchParams?.vista === "servicios" ? "servicios" : "licencias";

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

  const inGroup = (group: LicenseGroup) => licenses.filter((l) => groupOfKind(l.kind) === group);
  const rowsIn = (group: LicenseGroup) => rows.filter((r) => groupOfKind(r.kind) === group);

  const tabs: PageTab[] = [
    { key: "licencias", label: "Licencias", href: "/admin/licencias", badge: badgeOf(inGroup("LICENSE")) },
    {
      key: "servicios",
      label: "Servicios",
      href: "/admin/licencias?vista=servicios",
      badge: badgeOf(inGroup("SERVICE")),
    },
  ];

  // El calendario solo se arma para el admin, que es quien lo puede abrir.
  const calendar = isAdmin
    ? getPaymentCalendar(
        licenses.filter((l) => l.status === "ACTIVE"),
        12
      )
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <PageTabs tabs={tabs} active={vista} />
        </div>
        {calendar && (
          <PaymentCalendarDialog>
            <PaymentCalendar months={calendar} />
          </PaymentCalendarDialog>
        )}
      </div>

      {vista === "licencias" ? (
        <LicensesTable
          group="LICENSE"
          licenses={rowsIn("LICENSE")}
          retirePendingIds={pendingRetire.licenses}
          action={<LicenseWizard group="LICENSE" />}
        />
      ) : (
        <LicensesTable
          group="SERVICE"
          licenses={rowsIn("SERVICE")}
          retirePendingIds={pendingRetire.licenses}
          action={<LicenseWizard group="SERVICE" />}
        />
      )}
    </div>
  );
}
