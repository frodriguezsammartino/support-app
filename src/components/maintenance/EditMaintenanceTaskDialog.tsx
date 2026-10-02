"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateMaintenanceTask } from "@/lib/actions/maintenance";
import type { Schedule } from "@/lib/maintenance";
import { ScheduleFields } from "./ScheduleFields";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type EditableTask = Schedule & {
  id: string;
  title: string;
  description: string | null;
};

export function EditMaintenanceTaskDialog({ task }: { task: EditableTask }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [schedule, setSchedule] = useState<Schedule>(task);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Pencil className="size-4" />
            Editar
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar tarea periódica</DialogTitle>
          <DialogDescription>Cambiar el título, la descripción o cuándo se repite.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label>Tarea</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Descripción (opcional)</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <ScheduleFields initial={task} onChange={setSchedule} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            disabled={isPending}
            onClick={() => {
              if (!title.trim()) {
                toast.error("Contá brevemente la tarea.");
                return;
              }
              startTransition(async () => {
                const result = await updateMaintenanceTask(task.id, {
                  title,
                  description: description || undefined,
                  ...schedule,
                });
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                setOpen(false);
                router.refresh();
              });
            }}
          >
            {isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
