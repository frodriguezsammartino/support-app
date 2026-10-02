"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createMaintenanceTask } from "@/lib/actions/maintenance";
import type { Schedule } from "@/lib/maintenance";
import { DEFAULT_SCHEDULE, ScheduleFields } from "./ScheduleFields";
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

export function NewMaintenanceTaskDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [schedule, setSchedule] = useState<Schedule>(DEFAULT_SCHEDULE);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setDescription("");
    setSchedule(DEFAULT_SCHEDULE);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" />
            Nueva tarea periódica
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva tarea periódica</DialogTitle>
          <DialogDescription>
            Un control recurrente, como actualizar servidores o chequear antivirus.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label>Tarea</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Actualizar servidores"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Descripción (opcional)</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {/* La key fuerza el remonte al reabrir, para que el formulario arranque limpio. */}
          <ScheduleFields key={open ? "open" : "closed"} onChange={setSchedule} />
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
                const result = await createMaintenanceTask({
                  title,
                  description: description || undefined,
                  ...schedule,
                });
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                reset();
                setOpen(false);
                toast.success("Tarea creada.");
                router.refresh();
              });
            }}
          >
            {isPending ? "Guardando..." : "Crear tarea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
