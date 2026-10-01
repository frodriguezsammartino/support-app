"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateMaintenanceTask } from "@/lib/actions/maintenance";
import { FrequencyFields } from "./FrequencyFields";
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
import type { MaintenanceTask } from "@prisma/client";

export function EditMaintenanceTaskDialog({ task }: { task: MaintenanceTask }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [intervalHours, setIntervalHours] = useState(task.intervalHours);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" title="Editar">
            <Pencil className="size-4" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar tarea periódica</DialogTitle>
          <DialogDescription>Cambiar el título, la descripción o la frecuencia.</DialogDescription>
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
          <FrequencyFields initialHours={intervalHours} onChange={setIntervalHours} />
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
                  intervalHours,
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
