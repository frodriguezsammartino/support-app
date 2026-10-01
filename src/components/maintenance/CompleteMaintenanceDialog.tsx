"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { completeMaintenanceTask } from "@/lib/actions/maintenance";
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
import { Textarea } from "@/components/ui/textarea";

export function CompleteMaintenanceDialog({ taskId, taskTitle }: { taskId: string; taskTitle: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setNote("");
        setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" title="Marcar como hecho">
            <CheckCircle2 className="size-4" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar como hecho</DialogTitle>
          <DialogDescription>{taskTitle}</DialogDescription>
        </DialogHeader>
        <Textarea
          rows={3}
          placeholder="Nota (opcional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await completeMaintenanceTask(taskId, note || undefined);
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                setNote("");
                setOpen(false);
                router.refresh();
              });
            }}
          >
            {isPending ? "Guardando..." : "Marcar como hecho"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
