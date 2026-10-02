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
import { Button } from "@/components/ui/button";

function TwoLineCell({ main, sub, className }: { main: string; sub?: string; className?: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className={className ?? "text-zinc-700"}>{main}</span>
      {sub && <span className="text-xs text-zinc-400">{sub}</span>}
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
    <Card>
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
                <TableCell colSpan={7} className="py-8 text-center text-sm text-zinc-500">
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
                      className="font-medium hover:underline"
                    >
                      {task.title}
                    </Link>
                    {task.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{task.description}</p>
                    )}
                  </TableCell>

                  <TableCell>
                    {task.asset ? (
                      <Link
                        href={`/admin/equipos/${task.asset.id}`}
                        className="text-sm text-zinc-700 hover:underline"
                      >
                        {task.asset.name}
                      </Link>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-600">{describeRecurrence(task)}</TableCell>

                  <TableCell>
                    {task.lastCompletedAt ? (
                      <TwoLineCell
                        main={`hace ${formatDistanceToNow(task.lastCompletedAt, { locale: es })}`}
                        sub={format(task.lastCompletedAt, "dd/MM/yyyy HH:mm")}
                      />
                    ) : (
                      <span className="text-zinc-400">Nunca</span>
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
                        className="text-zinc-400 hover:bg-red-50 hover:text-red-600"
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
  );
}
