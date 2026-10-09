"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMaintenanceTask } from "@/lib/actions/maintenance";
import { describeRecurrence, MAINTENANCE_STATUS_META, type MaintenanceRow } from "@/lib/maintenance";
import { MaintenanceStatusBadge } from "./MaintenanceStatusBadge";
import { CompleteMaintenanceDialog } from "./CompleteMaintenanceDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  DesktopTable,
  EmptyRecords,
  MobileRecords,
  RecordActions,
  RecordCard,
  RecordField,
  RecordFields,
  RecordTop,
} from "@/components/ui/record-list";
import { Button } from "@/components/ui/button";

function TwoLineCell({ main, sub, className }: { main: string; sub?: string; className?: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className={className ?? "text-ink"}>{main}</span>
      {sub && <span className="text-xs text-slate-400">{sub}</span>}
    </div>
  );
}

export function MaintenanceTable({ rows }: { rows: MaintenanceRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete(task: MaintenanceRow) {
    if (!confirm(`¿Eliminar la tarea "${task.title}"? Se borra también todo su historial.`)) return;
    startTransition(async () => {
      const result = await deleteMaintenanceTask(task.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <MobileRecords>
        {rows.length === 0 && <EmptyRecords>Todavía no cargaste ninguna tarea periódica.</EmptyRecords>}

        {rows.map((task) => {
          const meta = MAINTENANCE_STATUS_META[task.status];
          return (
            <RecordCard key={task.id} className={meta.rowClass}>
              <RecordTop>
                <Link href={`/admin/mantenimiento/${task.id}`} className="min-w-0 font-medium text-ink">
                  {task.title}
                </Link>
                <MaintenanceStatusBadge status={task.status} />
              </RecordTop>

              <RecordFields>
                {task.asset && (
                  <RecordField label="Equipo">
                    <Link href={`/admin/equipos/${task.asset.id}`} className="hover:underline">
                      {task.asset.name}
                    </Link>
                  </RecordField>
                )}
                <RecordField label="Se repite">{describeRecurrence(task)}</RecordField>
                <RecordField label="Última vez">
                  {task.lastCompletedAt
                    ? `hace ${formatDistanceToNow(task.lastCompletedAt, { locale: es })}`
                    : "Nunca"}
                </RecordField>
                <RecordField label="Próxima">
                  <span className={meta.textClass}>
                    {task.status === "OVERDUE"
                      ? `venció hace ${formatDistanceToNow(task.nextDueAt, { locale: es })}`
                      : `en ${formatDistanceToNow(task.nextDueAt, { locale: es })}`}
                  </span>
                  <span className="block text-xs text-slate-400">
                    {format(task.nextDueAt, "dd/MM/yyyy HH:mm")}
                  </span>
                </RecordField>
              </RecordFields>

              <RecordActions>
                <CompleteMaintenanceDialog
                  taskId={task.id}
                  taskTitle={task.title}
                  done={task.status === "OK" || task.status === "FINISHED"}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleDelete(task)}
                  className="text-[#991B1B] hover:bg-[#FEE2E2] hover:text-[#991B1B]"
                >
                  <Trash2 className="size-4" />
                  Eliminar
                </Button>
              </RecordActions>
            </RecordCard>
          );
        })}
      </MobileRecords>

      <DesktopTable>
        <Card className="py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">Estado</TableHead>
                  <TableHead>Tarea</TableHead>
                  <TableHead className="w-44">Equipo</TableHead>
                  <TableHead className="w-64">Se repite</TableHead>
                  <TableHead className="w-48">Última vez</TableHead>
                  <TableHead className="w-48">Próxima</TableHead>
                  <TableHead className="w-48" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-ink-muted">
                      Todavía no cargaste ninguna tarea periódica.
                    </TableCell>
                  </TableRow>
                )}

                {rows.map((task) => {
                  const meta = MAINTENANCE_STATUS_META[task.status];
                  return (
                    <TableRow key={task.id} className={meta.rowClass}>
                      <TableCell>
                        <MaintenanceStatusBadge status={task.status} />
                      </TableCell>

                      <TableCell>
                        <Link
                          href={`/admin/mantenimiento/${task.id}`}
                          className="font-medium text-ink hover:underline"
                        >
                          {task.title}
                        </Link>
                        {task.description && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">{task.description}</p>
                        )}
                      </TableCell>

                      <TableCell>
                        {task.asset ? (
                          <Link
                            href={`/admin/equipos/${task.asset.id}`}
                            className="text-sm text-ink hover:underline"
                          >
                            {task.asset.name}
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-ink-muted">{describeRecurrence(task)}</TableCell>

                      <TableCell>
                        {task.lastCompletedAt ? (
                          <TwoLineCell
                            main={`hace ${formatDistanceToNow(task.lastCompletedAt, { locale: es })}`}
                            sub={format(task.lastCompletedAt, "dd/MM/yyyy HH:mm")}
                          />
                        ) : (
                          <span className="text-slate-400">Nunca</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <TwoLineCell
                          main={
                            task.status === "OVERDUE"
                              ? `venció hace ${formatDistanceToNow(task.nextDueAt, { locale: es })}`
                              : `en ${formatDistanceToNow(task.nextDueAt, { locale: es })}`
                          }
                          sub={format(task.nextDueAt, "dd/MM/yyyy HH:mm")}
                          className={meta.textClass}
                        />
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <CompleteMaintenanceDialog
                            taskId={task.id}
                            taskTitle={task.title}
                            done={task.status === "OK" || task.status === "FINISHED"}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title="Eliminar"
                            disabled={isPending}
                            onClick={() => handleDelete(task)}
                            className="text-slate-400 hover:bg-[#FEE2E2] hover:text-[#991B1B]"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </DesktopTable>
    </div>
  );
}
