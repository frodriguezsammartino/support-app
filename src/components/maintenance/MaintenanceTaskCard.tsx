"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Power, PowerOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMaintenanceTask, toggleMaintenanceTaskActive } from "@/lib/actions/maintenance";
import { describeInterval, getMaintenanceStatus, getNextDueAt, MAINTENANCE_STATUS_META } from "@/lib/maintenance";
import { MaintenanceStatusBadge } from "./MaintenanceStatusBadge";
import { EditMaintenanceTaskDialog } from "./EditMaintenanceTaskDialog";
import { CompleteMaintenanceDialog } from "./CompleteMaintenanceDialog";
import { MaintenanceHistoryDialog } from "./MaintenanceHistoryDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MaintenanceCompletion, MaintenanceTask } from "@prisma/client";

type TaskWithCompletions = MaintenanceTask & { completions: MaintenanceCompletion[] };

export function MaintenanceTaskCard({ task }: { task: TaskWithCompletions }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const status = getMaintenanceStatus(task);
  const nextDueAt = getNextDueAt(task);
  const borderClass = MAINTENANCE_STATUS_META[status].dot.replace("bg-", "border-t-");

  function handleDelete() {
    if (!confirm(`¿Eliminar la tarea "${task.title}"? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const result = await deleteMaintenanceTask(task.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleToggleActive() {
    startTransition(async () => {
      const result = await toggleMaintenanceTaskActive(task.id, !task.active);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card className={`border-t-4 ${borderClass} ${task.active ? "" : "opacity-60"}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{task.title}</CardTitle>
          <MaintenanceStatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {task.description && <p className="text-sm text-zinc-600">{task.description}</p>}
        <div className="flex flex-col gap-1 text-sm text-zinc-500">
          <p>Frecuencia: {describeInterval(task.intervalHours)}</p>
          <p>Última vez: {task.lastCompletedAt ? task.lastCompletedAt.toLocaleString("es-AR") : "Nunca"}</p>
          <p>Próximo vencimiento: {nextDueAt.toLocaleString("es-AR")}</p>
        </div>
        <div className="flex items-center gap-1 border-t pt-2">
          <CompleteMaintenanceDialog taskId={task.id} taskTitle={task.title} />
          <EditMaintenanceTaskDialog task={task} />
          <MaintenanceHistoryDialog taskTitle={task.title} completions={task.completions} />
          <Button
            variant="ghost"
            size="icon-sm"
            title={task.active ? "Desactivar" : "Activar"}
            disabled={isPending}
            onClick={handleToggleActive}
          >
            {task.active ? <PowerOff className="size-4" /> : <Power className="size-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Eliminar"
            disabled={isPending}
            onClick={handleDelete}
            className="ml-auto text-zinc-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
