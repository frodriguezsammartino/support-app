import { notFound } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { describeRecurrence, MAINTENANCE_STATUS_META, toMaintenanceRow } from "@/lib/maintenance";
import { MaintenanceStatusBadge } from "@/components/maintenance/MaintenanceStatusBadge";
import { CompleteMaintenanceDialog } from "@/components/maintenance/CompleteMaintenanceDialog";
import { EditMaintenanceTaskDialog } from "@/components/maintenance/EditMaintenanceTaskDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function MaintenanceTaskDetailPage(
  props: PageProps<"/admin/mantenimiento/[id]">
) {
  const { id } = await props.params;

  const task = await db.maintenanceTask.findUnique({
    where: { id },
    include: {
      completions: { orderBy: { completedAt: "desc" } },
      _count: { select: { completions: true } },
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
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"
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
            <p className="whitespace-pre-wrap text-sm text-zinc-700">{task.description}</p>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-zinc-50/60 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Se repite</p>
              <p className="text-sm font-medium">{describeRecurrence(task)}</p>
            </div>
            <div className="rounded-lg border bg-zinc-50/60 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Última vez</p>
              {task.lastCompletedAt ? (
                <>
                  <p className="text-sm font-medium">
                    hace {formatDistanceToNow(task.lastCompletedAt, { locale: es })}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {format(task.lastCompletedAt, "dd/MM/yyyy HH:mm")}
                  </p>
                </>
              ) : (
                <p className="text-sm text-zinc-400">Nunca</p>
              )}
            </div>
            <div className="rounded-lg border bg-zinc-50/60 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Próxima</p>
              <p className={`text-sm ${meta.textClass}`}>
                {row.status === "OVERDUE"
                  ? `venció hace ${formatDistanceToNow(row.nextDueAt, { locale: es })}`
                  : `en ${formatDistanceToNow(row.nextDueAt, { locale: es })}`}
              </p>
              <p className="text-xs text-zinc-400">{format(row.nextDueAt, "dd/MM/yyyy HH:mm")}</p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-2">
            <CompleteMaintenanceDialog
              taskId={task.id}
              taskTitle={task.title}
              done={row.status === "OK" || row.status === "FINISHED"}
            />
            <EditMaintenanceTaskDialog task={task} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Historial de mantenimientos
            <span className="ml-2 text-sm font-normal text-zinc-500">
              {task.completions.length} registro{task.completions.length === 1 ? "" : "s"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-0">
          {task.completions.length === 0 && (
            <p className="text-sm text-zinc-500">
              Todavía no se registró ninguna vez que se haya hecho esta tarea.
            </p>
          )}

          {task.completions.map((completion, index) => (
            <div key={completion.id} className="flex gap-3">
              {/* Línea de tiempo: punto + hilo vertical, salvo en el último registro. */}
              <div className="flex flex-col items-center">
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-blue-600" />
                {index < task.completions.length - 1 && (
                  <span className="w-px flex-1 bg-zinc-200" />
                )}
              </div>
              <div className={index < task.completions.length - 1 ? "pb-5" : ""}>
                <p className="text-sm font-medium leading-tight">
                  {format(completion.completedAt, "dd/MM/yyyy HH:mm")}
                  <span className="ml-2 text-xs font-normal text-zinc-400">
                    hace {formatDistanceToNow(completion.completedAt, { locale: es })}
                  </span>
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-600">
                  {completion.note || <span className="text-zinc-400">Sin nota.</span>}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
