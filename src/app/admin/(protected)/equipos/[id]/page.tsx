import { notFound } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Ticket as TicketIcon, Wrench } from "lucide-react";
import { db } from "@/lib/db";
import { ASSET_STATUS_META, ASSET_TYPE_LABELS, WARRANTY_META, getWarrantyState } from "@/lib/assets";
import { describeRecurrence, getNextDueAt } from "@/lib/maintenance";
import { STATUS_LABELS } from "@/lib/priority";
import { EditAssetDialog } from "@/components/assets/EditAssetDialog";
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

  const asset = await db.asset.findUnique({
    where: { id },
    include: {
      tickets: { include: { category: true }, orderBy: { createdAt: "desc" } },
      maintenanceTasks: {
        include: { completions: { orderBy: { completedAt: "desc" }, take: 50 } },
      },
    },
  });

  if (!asset) notFound();

  const statusMeta = ASSET_STATUS_META[asset.status];
  const warrantyMeta = WARRANTY_META[getWarrantyState(asset.warrantyUntil)];
  const openTickets = asset.tickets.filter((t) => t.status !== "COMPLETED");

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
            <Field
              label="Marca y modelo"
              value={[asset.brand, asset.model].filter(Boolean).join(" ") || "—"}
            />
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
            <EditAssetDialog asset={asset} />
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
