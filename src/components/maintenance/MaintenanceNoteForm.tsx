"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { addMaintenanceNote } from "@/lib/actions/maintenance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function MaintenanceNoteForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [at, setAt] = useState("");
  const [isPending, startTransition] = useTransition();
  // Lazy init: leer el reloj durante el render rompe la regla de pureza de React.
  const [nowLocalValue] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-zinc-50/60 p-3">
      <div className="flex items-center gap-2">
        <MessageSquarePlus className="size-4 text-blue-600" />
        <span className="text-sm font-medium">Agregar una observación</span>
      </div>

      <Textarea
        rows={2}
        placeholder="Ej: el disco D quedó al 88%, hay que seguirlo la semana que viene"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-zinc-500">¿Cuándo? (opcional)</Label>
          <Input
            type="datetime-local"
            className="h-9 w-56"
            max={nowLocalValue}
            value={at}
            onChange={(e) => setAt(e.target.value)}
          />
        </div>

        <Button
          size="sm"
          disabled={isPending || note.trim().length < 2}
          onClick={() => {
            startTransition(async () => {
              const result = await addMaintenanceNote(
                taskId,
                note,
                at ? new Date(at) : undefined
              );
              if (result.error) {
                toast.error(result.error);
                return;
              }
              setNote("");
              setAt("");
              router.refresh();
            });
          }}
        >
          {isPending ? "Guardando..." : "Agregar al historial"}
        </Button>
      </div>

      <p className="text-xs text-zinc-500">
        Una observación queda registrada pero no cuenta como que hiciste la tarea: el próximo
        vencimiento no se mueve.
      </p>
    </div>
  );
}
