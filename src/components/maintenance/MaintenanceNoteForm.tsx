"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { addMaintenanceNote } from "@/lib/actions/maintenance";
import { Button } from "@/components/ui/button";
import { WhenPicker } from "@/components/ui/when-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function MaintenanceNoteForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [at, setAt] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-slate-50 p-3">
      <div className="flex items-center gap-2">
        <MessageSquarePlus className="size-4 text-brand" />
        <span className="text-sm font-medium">Agregar una observación</span>
      </div>

      <Textarea
        rows={2}
        placeholder="Ej: el disco D quedó al 88%, hay que seguirlo la semana que viene"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-ink-muted">¿Cuándo?</Label>
          <WhenPicker value={at} onChange={setAt} />
        </div>

        <Button
          size="sm"
          disabled={isPending || note.trim().length < 2}
          onClick={() => {
            startTransition(async () => {
              const result = await addMaintenanceNote(taskId, note, at ?? undefined);
              if (result.error) {
                toast.error(result.error);
                return;
              }
              setNote("");
              setAt(null);
              router.refresh();
            });
          }}
        >
          {isPending ? "Guardando..." : "Agregar al historial"}
        </Button>
      </div>

      <p className="text-xs text-ink-muted">
        Una observación queda registrada pero no cuenta como que hiciste la tarea: el próximo
        vencimiento no se mueve.
      </p>
    </div>
  );
}
