import { notFound } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, ClipboardList, Ticket as TicketIcon, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import { getRole } from "@/lib/adminAuth";
import {
  ASSET_STATUS_META,
  ASSET_TYPE_LABELS,
  WARRANTY_META,
  getWarrantyState,
  hasOwner,
} from "@/lib/assets";
import { describeRecurrence, getNextDueAt } from "@/lib/maintenance";
import { STATUS_LABELS } from "@/lib/priority";
import { formatAmount } from "@/lib/licenses";
import { KIND_META, STATUS_META as REQUEST_STATUS_META, isSpendKind } from "@/lib/requests";
import { hasComponents } from "@/lib/components";
import {
  OFFICE_CATALOG,
  OS_CATALOG,
  SUPPORT_META,
  getSupportState,
  hasSoftware,
} from "@/lib/os";
import { EditAssetDialog } from "@/components/assets/EditAssetDialog";
import { AssetComponents } from "@/components/assets/AssetComponents";
import { RequestDialog } from "@/components/requests/RequestDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type HistoryEntry = {
  id: string;
  at: Date;
  kind: "TICKET" | "MAINTENANCE";
  title: string;
  detail: string | null;
  href?: string;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export default async function AssetDetailPage(props: PageProps<"/admin/equipos/[id]">) {
  const { id } = await props.params;

  const [categories, unassignedTickets] = await Promise.all([
    db.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.ticket.findMany({
      where: { status: { in: ["BACKLOG", "IN_PROGRESS"] }, assetId: null },
      select: { id: true, number: true, title: true },
      orderBy: { number: "desc" },
      take: 50,
    }),
  ]);

  const asset = await db.asset.findUnique({
    where: { id },
    include: {
      tickets: { include: { category: true }, orderBy: { createdAt: "desc" } },
      maintenanceTasks: {
        include: { completions: { orderBy: { completedAt: "desc" }, take: 50 } },
      },
      requests: { orderBy: { createdAt: "desc" } },
      components: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!asset) notFound();

  const statusMeta = ASSET_STATUS_META[asset.status];
  const warrantyMeta = WARRANTY_META[getWarrantyState(asset.warrantyUntil)];
  const openTickets = asset.tickets.filter((t) => t.status !== "COMPLETED");

  // Lo que se gastó en mejoras de este equipo, por moneda (nunca se suman monedas distintas).
  const isAdmin = (await getRole()) === "ADMIN";
  const upgradeSpend = asset.requests
    .filter((r) => isAdmin && isSpendKind(r.kind) && r.status === "APPROVED" && r.costCents)
    .reduce<Record<string, number>>((acc, r) => {
      acc[r.currency] = (acc[r.currency] ?? 0) + (r.costCents ?? 0);
      return acc;
    }, {});
  const assetOption = { id: asset.id, code: asset.code, name: asset.name, location: asset.location };
  const osState = getSupportState(asset.os, OS_CATALOG);
  const officeState = getSupportState(asset.office, OFFICE_CATALOG);

  // Una sola línea de tiempo con todo lo que le pasó al equipo.
  const history: HistoryEntry[] = [
    ...asset.tickets.map((ticket) => ({
      id: `t-${ticket.id}`,
      at: ticket.createdAt,
      kind: "TICKET" as const,
      title: `#${ticket.number} ${ticket.title}`,
      detail: `${STATUS_LABELS[ticket.status]} · reportado por ${ticket.reporterName}`,
      href: `/admin/tickets/${ticket.id}`,
    })),
    ...asset.maintenanceTasks.flatMap((task) =>
      task.completions.map((completion) => ({
        id: `m-${completion.id}`,
        at: completion.completedAt,
        kind: "MAINTENANCE" as const,
        title: task.title,
        detail: completion.note,
        href: `/admin/mantenimiento/${task.id}`,
      }))
    ),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Link
        href="/admin/equipos"
        className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Volver al inventario
      </Link>

      <Card className="border-t-4 border-t-brand">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle className="text-xl">
              <span className="text-slate-400">#{asset.code}</span> {asset.name}
            </CardTitle>
            <Badge className={statusMeta.badgeClass}>{statusMeta.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Tipo" value={ASSET_TYPE_LABELS[asset.type]} />
            <Field label="Ubicación" value={asset.location ?? "—"} />
            {hasOwner(asset.type) && <Field label="Responsable" value={asset.owner ?? "—"} />}
            <Field
              label="Marca y modelo"
              value={[asset.brand, asset.model].filter(Boolean).join(" ") || "—"}
            />
            {hasSoftware(asset.type) && (
              <>
                <div className="rounded-lg border bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-ink-muted">Sistema operativo</p>
                  <p className="text-sm font-medium">{asset.os ?? "—"}</p>
                  {osState === "ENDED" && (
                    <p className={`text-xs ${SUPPORT_META.ENDED.textClass}`}>Sin soporte</p>
                  )}
                </div>
                <div className="rounded-lg border bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-ink-muted">Ofimática</p>
                  <p className="text-sm font-medium">{asset.office ?? "—"}</p>
                  {officeState === "ENDED" && (
                    <p className={`text-xs ${SUPPORT_META.ENDED.textClass}`}>Sin soporte</p>
                  )}
                </div>
              </>
            )}
            <Field label="Número de serie" value={asset.serialNumber ?? "—"} />
            <Field
              label="Compra"
              value={asset.purchasedAt ? format(asset.purchasedAt, "dd/MM/yyyy") : "—"}
            />
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-ink-muted">Garantía</p>
              <p className={`text-sm font-medium ${warrantyMeta.className}`}>{warrantyMeta.label}</p>
              {asset.warrantyUntil && (
                <p className="text-xs text-slate-400">{format(asset.warrantyUntil, "dd/MM/yyyy")}</p>
              )}
            </div>
          </div>

          {asset.notes && (
            <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-ink">
              {asset.notes}
            </p>
          )}

          <Separator />

          <div className="flex flex-wrap items-center gap-3">
            <EditAssetDialog
              asset={{
                id: asset.id,
                name: asset.name,
                type: asset.type,
                status: asset.status,
                brand: asset.brand,
                model: asset.model,
                serialNumber: asset.serialNumber,
                location: asset.location,
                owner: asset.owner,
                os: asset.os,
                office: asset.office,
                purchasedAt: asset.purchasedAt,
                warrantyUntil: asset.warrantyUntil,
                notes: asset.notes,
              }}
              categories={categories}
              openTickets={unassignedTickets}
              hasOpenTicket={openTickets.length > 0}
            />
            <RequestDialog
              assets={[assetOption]}
              assetId={asset.id}
              lockAsset
              trigger={
                <Button variant="outline" size="sm">
                  <ClipboardList className="size-4" />
                  Hacer una solicitud
                </Button>
              }
            />
            <span className="text-sm text-ink-muted">
              {asset.tickets.length} ticket{asset.tickets.length === 1 ? "" : "s"} en total
              {openTickets.length > 0 && (
                <span className="font-medium text-brand">
                  {" "}
                  · {openTickets.length} sin cerrar
                </span>
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      {hasComponents(asset.type) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Componentes</CardTitle>
          </CardHeader>
          <CardContent>
            <AssetComponents
              asset={assetOption}
              components={asset.components.map((c) => ({
                id: c.id,
                kind: c.kind,
                description: c.description,
              }))}
            />
          </CardContent>
        </Card>
      )}

      {asset.requests.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <CardTitle className="text-base">Solicitudes de este equipo</CardTitle>
              {Object.keys(upgradeSpend).length > 0 && (
                <span className="text-sm text-ink-muted">
                  Gastado en mejoras:{" "}
                  <span className="font-medium text-ink">
                    {Object.entries(upgradeSpend)
                      .map(([currency, cents]) => `${currency} ${formatAmount(cents)}`)
                      .join(" · ")}
                  </span>
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {asset.requests.map((r) => (
              <div key={r.id} className="flex flex-col gap-1 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={KIND_META[r.kind].badgeClass}>{KIND_META[r.kind].label}</Badge>
                  <Badge className={REQUEST_STATUS_META[r.status].badgeClass}>
                    {REQUEST_STATUS_META[r.status].label}
                  </Badge>
                  <span className="text-sm font-medium">{r.title}</span>
                </div>
                <p className="text-sm text-ink-muted">{r.reason}</p>
                <p className="text-xs text-slate-400">
                  Pidió {r.requestedBy} el {format(r.createdAt, "dd/MM/yyyy")}
                  {isAdmin && r.status === "APPROVED" && r.costCents
                    ? ` · costo ${r.currency} ${formatAmount(r.costCents)}`
                    : isAdmin && r.status === "PENDING" && r.estimatedCostCents
                      ? ` · estimado ${r.currency} ${formatAmount(r.estimatedCostCents)}`
                      : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {asset.maintenanceTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mantenimiento de este equipo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {asset.maintenanceTasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border p-3"
              >
                <Link
                  href={`/admin/mantenimiento/${task.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {task.title}
                </Link>
                <span className="text-xs text-ink-muted">
                  {describeRecurrence(task)} · próxima{" "}
                  {format(getNextDueAt(task), "dd/MM/yyyy HH:mm")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Historial del equipo
            <span className="ml-2 text-sm font-normal text-ink-muted">
              {history.length} registro{history.length === 1 ? "" : "s"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-0">
          {history.length === 0 && (
            <p className="text-sm text-ink-muted">
              Todavía no hay tickets ni mantenimientos registrados para este equipo.
            </p>
          )}

          {history.map((entry, index) => (
            <div key={entry.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`mt-1 flex size-6 shrink-0 items-center justify-center rounded-full ${
                    entry.kind === "TICKET" ? "bg-brand-tint text-brand" : "bg-[#DCFCE7] text-[#166534]"
                  }`}
                >
                  {entry.kind === "TICKET" ? (
                    <TicketIcon className="size-3.5" />
                  ) : (
                    <Wrench className="size-3.5" />
                  )}
                </span>
                {index < history.length - 1 && <span className="w-px flex-1 bg-slate-200" />}
              </div>
              <div className={index < history.length - 1 ? "pb-5" : ""}>
                <p className="text-sm leading-tight">
                  {entry.href ? (
                    <Link href={entry.href} className="font-medium hover:underline">
                      {entry.title}
                    </Link>
                  ) : (
                    <span className="font-medium">{entry.title}</span>
                  )}
                </p>
                <p className="text-xs text-slate-400">
                  {format(entry.at, "dd/MM/yyyy HH:mm")} · hace{" "}
                  {formatDistanceToNow(entry.at, { locale: es })}
                </p>
                {entry.detail && (
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-muted">{entry.detail}</p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
