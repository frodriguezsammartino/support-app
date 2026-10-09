import { notFound } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, CheckCircle2, MessageSquare } from "lucide-react";
import { db } from "@/lib/db";
import { describeRecurrence, MAINTENANCE_STATUS_META, toMaintenanceRow } from "@/lib/maintenance";
import { MaintenanceStatusBadge } from "@/components/maintenance/MaintenanceStatusBadge";
import { CompleteMaintenanceDialog } from "@/components/maintenance/CompleteMaintenanceDialog";
import { MaintenanceNoteForm } from "@/components/maintenance/MaintenanceNoteForm";
import { EditMaintenanceTaskDialog } from "@/components/maintenance/EditMaintenanceTaskDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function MaintenanceTaskDetailPage(
  props: PageProps<"/admin/mantenimiento/[id]">
) {
  const { id } = await props.params;

  const assets = await db.asset.findMany({
    select: { id: true, code: true, name: true, location: true },
    orderBy: { code: "asc" },
  });

  const task = await db.maintenanceTask.findUnique({
    where: { id },
    include: {
      completions: { orderBy: { completedAt: "desc" } },
      asset: { select: { id: true, code: true, name: true } },
      _count: { select: { completions: { where: { kind: "DONE" } } } },
    },
  });

  if (!task) notFound();

  const row = toMaintenanceRow(task, task._count.completions);
  const meta = MAINTENANCE_STATUS_META[row.status];
  const borderClass = meta.dot.replace("bg-", "border-t-");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Link
        href="/admin/mantenimiento"
        className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Volver a Mantenimiento
      </Link>

      <Card className={`border-t-4 ${borderClass}`}>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <CardTitle className="text-xl">{task.title}</CardTitle>
            <MaintenanceStatusBadge status={row.status} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {task.description && (
            <p className="whitespace-pre-wrap text-sm text-ink">{task.description}</p>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-ink-muted">Se repite</p>
              <p className="text-sm font-medium">{describeRecurrence(task)}</p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-ink-muted">Última vez</p>
              {task.lastCompletedAt ? (
                <>
                  <p className="text-sm font-medium">
                    hace {formatDistanceToNow(task.lastCompletedAt, { locale: es })}
                  </p>
                  <p className="text-xs text-slate-400">
                    {format(task.lastCompletedAt, "dd/MM/yyyy HH:mm")}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-400">Nunca</p>
              )}
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-ink-muted">Próxima</p>
              <p className={`text-sm ${meta.textClass}`}>
                {row.status === "OVERDUE"
                  ? `venció hace ${formatDistanceToNow(row.nextDueAt, { locale: es })}`
                  : `en ${formatDistanceToNow(row.nextDueAt, { locale: es })}`}
              </p>
              <p className="text-xs text-slate-400">{format(row.nextDueAt, "dd/MM/yyyy HH:mm")}</p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-2">
            <CompleteMaintenanceDialog
              taskId={task.id}
              taskTitle={task.title}
              done={row.status === "OK" || row.status === "FINISHED"}
            />
            <EditMaintenanceTaskDialog task={task} assets={assets} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Historial
            <span className="ml-2 text-sm font-normal text-ink-muted">
              {task.completions.length} registro{task.completions.length === 1 ? "" : "s"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <MaintenanceNoteForm taskId={task.id} />

          {task.completions.length === 0 && (
            <p className="text-sm text-ink-muted">
              Todavía no hay nada registrado para esta tarea.
            </p>
          )}

          <div className="flex flex-col gap-0">

          {task.completions.map((entry, index) => {
            const isDone = entry.kind === "DONE";
            return (
              <div key={entry.id} className="flex gap-3">
                {/* Línea de tiempo: ícono + hilo vertical, salvo en el último registro. */}
                <div className="flex flex-col items-center">
                  <span
                    className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${
                      isDone ? "bg-[#DCFCE7] text-[#166534]" : "bg-slate-100 text-ink-muted"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="size-3.5" />
                    ) : (
                      <MessageSquare className="size-3.5" />
                    )}
                  </span>
                  {index < task.completions.length - 1 && (
                    <span className="w-px flex-1 bg-slate-200" />
                  )}
                </div>
                <div className={index < task.completions.length - 1 ? "pb-5" : ""}>
                  <p className="text-sm font-medium leading-tight">
                    {isDone ? "Se hizo" : "Observación"}
                    <span className="ml-2 font-normal text-ink-muted">
                      {format(entry.completedAt, "dd/MM/yyyy HH:mm")}
                    </span>
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      hace {formatDistanceToNow(entry.completedAt, { locale: es })}
                    </span>
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-muted">
                    {entry.note || <span className="text-slate-400">Sin nota.</span>}
                  </p>
                </div>
              </div>
            );
          })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
