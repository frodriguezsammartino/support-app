"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { triageAndStart } from "@/lib/actions/tickets";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY_META, PRIORITY_ORDER } from "@/lib/priority";
import type { TicketPriority } from "@prisma/client";

export function TriageDialog({
  ticketId,
  ticketTitle,
  categories,
  open,
  onOpenChange,
  onDone,
}: {
  ticketId: string | null;
  ticketTitle: string;
  categories: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  // Siempre strings definidos (nunca undefined): evita el warning de Base UI
  // por pasar de Select no controlado a controlado.
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState<TicketPriority | "">("");
  const [isPending, startTransition] = useTransition();
  const categoryLabels = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setCategoryId("");
          setPriority("");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Antes de pasarlo a En Progreso</DialogTitle>
          <DialogDescription>
            &quot;{ticketTitle}&quot; necesita categoría y urgencia asignadas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Categoría</Label>
            <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Elegí una categoría">
                  {(v: string) => categoryLabels[v] ?? "Elegí una categoría"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Urgencia</Label>
            <Select value={priority} onValueChange={(v) => v && setPriority(v as TicketPriority)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Elegí la urgencia">
                  {(v: string) => PRIORITY_META[v as TicketPriority]?.label ?? "Elegí la urgencia"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_ORDER.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            disabled={isPending}
            onClick={() => {
              if (!ticketId || !categoryId || !priority) {
                toast.error("Completá categoría y urgencia.");
                return;
              }
              startTransition(async () => {
                const result = await triageAndStart(ticketId, categoryId, priority);
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                setCategoryId("");
                setPriority("");
                onDone();
              });
            }}
          >
            {isPending ? "Guardando..." : "Mover a En Progreso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
