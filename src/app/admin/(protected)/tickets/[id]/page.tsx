import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { db } from "@/lib/db";
import { getRole } from "@/lib/adminAuth";
import { formatAmount } from "@/lib/licenses";
import { KIND_META, STATUS_META as REQUEST_STATUS_META } from "@/lib/requests";
import { StatusBadge } from "@/components/tickets/StatusBadge";
import { PriorityBadge } from "@/components/tickets/PriorityBadge";
import { CommentForm } from "@/components/tickets/CommentForm";
import { TicketAdminControls } from "@/components/tickets/TicketAdminControls";
import { TicketTitleEditor } from "@/components/tickets/TicketTitleEditor";
import { TicketAssetEditor } from "@/components/assets/TicketAssetEditor";
import { RequestDialog, type KnownComponent } from "@/components/requests/RequestDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function TicketDetailPage(props: PageProps<"/admin/tickets/[id]">) {
  const { id } = await props.params;

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      category: true,
      comments: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!ticket) notFound();

  const [categories, assets, components, role, requests] = await Promise.all([
    db.category.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.asset.findMany({
      select: { id: true, code: true, name: true, location: true },
      orderBy: { code: "asc" },
    }),
    // Las piezas de cada PC: sirven de punto de partida si el pedido es un reemplazo.
    db.assetComponent.findMany({
      select: { assetId: true, kind: true, description: true },
      orderBy: { createdAt: "asc" },
    }),
    getRole(),
    // Aparte del ticket: el ticket viaja entero a componentes del navegador, y los costos no tienen que ir ahí.
    db.request.findMany({ where: { ticketId: id }, orderBy: { createdAt: "desc" } }),
  ]);
  const isAdmin = role === "ADMIN";

  const componentsByAsset = components.reduce<Record<string, KnownComponent[]>>((acc, c) => {
    (acc[c.assetId] ??= []).push({ kind: c.kind, description: c.description });
    return acc;
  }, {});

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Link href="/admin" className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" />
        Volver al inicio
      </Link>

      <Card className="border-t-4 border-t-brand">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-xl">
              <span className="text-slate-400">#{ticket.number}</span>{" "}
              <TicketTitleEditor
                ticketId={ticket.id}
                title={ticket.title}
                inputClassName="h-9 min-w-64 text-xl font-semibold"
                buttonClassName="text-left text-xl font-semibold hover:underline"
              />
            </CardTitle>
            <div className="flex gap-2">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="whitespace-pre-wrap text-sm text-ink">
            {ticket.description || "Sin descripción adicional."}
          </p>
          <Separator />
          <div className="grid gap-1 text-sm text-ink-muted sm:grid-cols-2">
            <p>Reportado por: {ticket.reporterName}</p>
            <p>Email: {ticket.reporterEmail}</p>
            <p>Categoría: {ticket.category?.name ?? "Sin categoría"}</p>
            <p>Creado: {ticket.createdAt.toLocaleString("es-AR")}</p>
            {ticket.completedAt && <p>Resuelto: {ticket.completedAt.toLocaleString("es-AR")}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-muted">Equipo:</span>
            <TicketAssetEditor ticketId={ticket.id} assetId={ticket.assetId} assets={assets} />
          </div>
          {/* Si arreglarlo no alcanza, el pedido sale de acá y queda enlazado a este ticket. */}
          <div>
            <RequestDialog
              assets={assets}
              assetId={ticket.assetId ?? ""}
              ticketId={ticket.id}
              componentsByAsset={componentsByAsset}
              initialKind="CHANGE"
              trigger={
                <Button variant="outline" size="sm">
                  <ClipboardList className="size-4" />
                  Solicitar reemplazo o mejora
                </Button>
              }
            />
          </div>
          {ticket.resolutionNote && (
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-medium">Nota de resolución</p>
              <p className="whitespace-pre-wrap text-ink">{ticket.resolutionNote}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Solicitudes de este ticket</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {requests.map((r) => (
              <div key={r.id} className="flex flex-col gap-1 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={KIND_META[r.kind].badgeClass}>{KIND_META[r.kind].label}</Badge>
                  <Badge className={REQUEST_STATUS_META[r.status].badgeClass}>
                    {REQUEST_STATUS_META[r.status].label}
                  </Badge>
                  <span className="text-sm font-medium">{r.title}</span>
                </div>
                {r.reason && <p className="text-sm text-ink-muted">{r.reason}</p>}
                <p className="text-xs text-slate-400">
                  Pidió {r.requestedBy} el {r.createdAt.toLocaleDateString("es-AR")}
                  {isAdmin && r.status === "APPROVED" && r.costCents
                    ? ` · costo ${r.currency} ${formatAmount(r.costCents)}`
                    : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <TicketAdminControls ticket={ticket} categories={categories} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notas internas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {ticket.comments.length === 0 && (
            <p className="text-sm text-ink-muted">Todavía no hay notas.</p>
          )}
          {ticket.comments.map((comment) => (
            <div key={comment.id} className="rounded-lg border p-3 text-sm">
              <div className="mb-1 text-xs text-ink-muted">{comment.createdAt.toLocaleString("es-AR")}</div>
              <p className="whitespace-pre-wrap">{comment.body}</p>
            </div>
          ))}
          <Separator />
          <CommentForm ticketId={ticket.id} />
        </CardContent>
      </Card>
    </div>
  );
}
