import Link from "next/link";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { getRole } from "@/lib/adminAuth";
import { formatAmount } from "@/lib/licenses";
import {
  KIND_META,
  STATUS_META,
  componentLabel,
  type RequestKind,
  type RetireTarget,
} from "@/lib/requests";
import { ResolveRequestDialog } from "@/components/requests/ResolveRequestDialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type RequestItem = Awaited<ReturnType<typeof loadRequests>>[number];

function loadRequests() {
  return db.request.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
}

function retireTargetOf(r: RequestItem): RetireTarget | null {
  if (r.kind !== "RETIRE") return null;
  if (r.assetId) return "ASSET";
  if (r.licenseId) return "LICENSE";
  if (r.taskId) return "TASK";
  return null;
}

function targetHref(r: RequestItem) {
  if (r.assetId) return `/admin/equipos/${r.assetId}`;
  if (r.taskId) return `/admin/mantenimiento/${r.taskId}`;
  if (r.licenseId) return "/admin/licencias";
  return null;
}

function money(cents: number | null, currency: string) {
  return cents && cents > 0 ? `${currency} ${formatAmount(cents)}` : null;
}

function RequestCard({ request, isAdmin }: { request: RequestItem; isAdmin: boolean }) {
  const kind = KIND_META[request.kind as RequestKind];
  const status = STATUS_META[request.status];
  const href = targetHref(request);
  const component = componentLabel(request.component);
  const pending = request.status === "PENDING";

  // La plata es del administrador: el técnico ve en qué quedó su pedido, no el monto.
  const costLine = !isAdmin
    ? null
    : request.status === "APPROVED"
      ? money(request.costCents, request.currency)
      : money(request.estimatedCostCents, request.currency);

  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={kind.badgeClass}>{kind.label}</Badge>
            <Badge className={status.badgeClass}>{status.label}</Badge>
            <span className="text-xs text-slate-400">#{request.number}</span>
          </div>

          <p className="font-medium text-ink">{request.title}</p>

          <p className="text-sm text-ink-muted">
            {request.kind === "UPGRADE" ? "Equipo: " : ""}
            {href ? (
              <Link href={href} className="text-brand hover:underline">
                {request.targetLabel}
              </Link>
            ) : (
              request.targetLabel
            )}
            {component && ` · ${component}`}
          </p>

          <p className="text-sm text-ink">{request.reason}</p>

          <p className="text-xs text-slate-400">
            Pidió {request.requestedBy} el {format(request.createdAt, "dd/MM/yyyy")}
            {costLine && (
              <>
                {" · "}
                {request.status === "APPROVED" ? "Costo " : "Estimado "}
                <span className="font-medium text-ink-muted">{costLine}</span>
              </>
            )}
          </p>

          {request.decidedAt && (
            <p className="text-xs text-slate-400">
              {request.status === "APPROVED" ? "Aprobada" : "Rechazada"} el{" "}
              {format(request.decidedAt, "dd/MM/yyyy")}
              {request.decisionNote && ` · ${request.decisionNote}`}
            </p>
          )}
        </div>

        {pending && isAdmin && (
          <div className="flex shrink-0 gap-2">
            <ResolveRequestDialog
              decision="REJECT"
              request={{
                id: request.id,
                kind: request.kind,
                title: request.title,
                targetLabel: request.targetLabel,
                retireTarget: retireTargetOf(request),
                estimatedCostCents: request.estimatedCostCents,
                currency: request.currency,
                canCreateTicket: false,
              }}
            />
            <ResolveRequestDialog
              decision="APPROVE"
              request={{
                id: request.id,
                kind: request.kind,
                title: request.title,
                targetLabel: request.targetLabel,
                retireTarget: retireTargetOf(request),
                estimatedCostCents: request.estimatedCostCents,
                currency: request.currency,
                canCreateTicket: request.kind === "UPGRADE" && !!request.assetId,
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function SolicitudesPage() {
  const [role, requests] = await Promise.all([getRole(), loadRequests()]);
  const isAdmin = role === "ADMIN";

  const pending = requests.filter((r) => r.status === "PENDING");
  const resolved = requests.filter((r) => r.status !== "PENDING");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Solicitudes</h1>
        <p className="text-sm text-ink-muted">
          {isAdmin
            ? "Lo que pidió el técnico: bajas y mejoras. Nada se borra ni se gasta hasta que lo aprobás."
            : "Tus pedidos al administrador: bajas y mejoras. Acá ves en qué quedó cada uno."}
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink">
          Pendientes <span className="font-normal text-ink-muted">({pending.length})</span>
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line bg-white px-4 py-6 text-center text-sm text-ink-muted">
            No hay solicitudes pendientes.
          </p>
        ) : (
          pending.map((r) => <RequestCard key={r.id} request={r} isAdmin={isAdmin} />)
        )}
      </section>

      {resolved.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-ink">
            Resueltas <span className="font-normal text-ink-muted">({resolved.length})</span>
          </h2>
          {resolved.map((r) => (
            <RequestCard key={r.id} request={r} isAdmin={isAdmin} />
          ))}
        </section>
      )}
    </div>
  );
}
