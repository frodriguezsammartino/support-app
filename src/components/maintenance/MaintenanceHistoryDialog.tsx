"use client";

import { useState } from "react";
import { History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { MaintenanceCompletion } from "@prisma/client";

export function MaintenanceHistoryDialog({
  taskTitle,
  completions,
}: {
  taskTitle: string;
  completions: MaintenanceCompletion[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" title="Ver historial">
            <History className="size-4" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Historial</DialogTitle>
          <DialogDescription>{taskTitle}</DialogDescription>
        </DialogHeader>
        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {completions.length === 0 && (
            <p className="text-sm text-zinc-500">Todavía no se marcó como hecha ninguna vez.</p>
          )}
          {completions.map((c) => (
            <div key={c.id} className="rounded-lg border p-3 text-sm">
              <div className="mb-1 text-xs text-zinc-500">{c.completedAt.toLocaleString("es-AR")}</div>
              {c.note && <p className="whitespace-pre-wrap">{c.note}</p>}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
