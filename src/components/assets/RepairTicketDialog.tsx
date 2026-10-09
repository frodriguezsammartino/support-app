"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createInternalTicket } from "@/lib/actions/tickets";
import { updateTicketAsset } from "@/lib/actions/assets";
import { PRIORITY_META, PRIORITY_ORDER } from "@/lib/priority";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TicketPriority } from "@prisma/client";

export type OpenTicketOption = { id: string; number: number; title: string };

type Mode = "NEW" | "LINK";

/**
 * Se abre cuando un equipo pasa a "En reparación" y todavía no tiene un ticket
 * abierto: sin ticket no hay forma de seguir la reparación ni de saber después
 * cuánto tardó.
 */
export function RepairTicketDialog({
  open,
  onOpenChange,
  assetId,
  assetName,
  categories,
  openTickets,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetName: string;
  categories: { id: string; name: string }[];
  /** Tickets abiertos que todavía no están vinculados a ningún equipo. */
  openTickets: OpenTicketOption[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("NEW");
  const [title, setTitle] = useState(`Reparar ${assetName}`);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [priority, setPriority] = useState<TicketPriority>("HIGH");
  const [ticketId, setTicketId] = useState("");
  const [isPending, startTransition] = useTransition();

  function close() {
    onOpenChange(false);
  }

  function submit() {
    if (mode === "LINK") {
      if (!ticketId) {
        toast.error("Elegí el ticket que corresponde a esta reparación.");
        return;
      }
      startTransition(async () => {
        const result = await updateTicketAsset(ticketId, assetId);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Ticket vinculado al equipo.");
        close();
        router.refresh();
      });
      return;
    }

    if (!title.trim() || !categoryId) {
      toast.error("Completá qué hay que reparar y la categoría.");
      return;
    }
    startTransition(async () => {
      const result = await createInternalTicket({
        title,
        categoryId,
        priority,
        assetId,
        description: `Reparación del equipo ${assetName}.`,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Ticket de reparación creado.");
      close();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Seguimiento de la reparación</DialogTitle>
          <DialogDescription>
            {assetName} quedó en reparación. Cargá un ticket para poder seguirla.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={mode === "NEW"}
            onClick={() => setMode("NEW")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
              mode === "NEW"
                ? "border-brand bg-brand-tint font-medium text-brand"
                : "border-slate-300 bg-white text-ink-muted hover:bg-slate-50"
            }`}
          >
            Crear un ticket
          </button>
          <button
            type="button"
            aria-pressed={mode === "LINK"}
            disabled={openTickets.length === 0}
            onClick={() => setMode("LINK")}
            title={openTickets.length === 0 ? "No hay tickets abiertos sin equipo" : undefined}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              mode === "LINK"
                ? "border-brand bg-brand-tint font-medium text-brand"
                : "border-slate-300 bg-white text-ink-muted hover:bg-slate-50"
            }`}
          >
            Vincular uno existente
          </button>
        </div>

        {mode === "NEW" ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label>¿Qué hay que reparar?</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Categoría</Label>
                <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(v: string) => categories.find((c) => c.id === v)?.name ?? "Elegí una"}
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
                <Select
                  value={priority}
                  onValueChange={(v) => v && setPriority(v as TicketPriority)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(v: string) => PRIORITY_META[v as TicketPriority]?.label ?? ""}
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
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label>¿Cuál es el ticket de esta reparación?</Label>
            <Select value={ticketId} onValueChange={(v) => v && setTicketId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Elegí un ticket">
                  {(v: string) => {
                    const t = openTickets.find((o) => o.id === v);
                    return t ? `#${t.number} ${t.title}` : "Elegí un ticket";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {openTickets.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    #{t.number} {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-ink-muted">
              Solo aparecen los tickets abiertos que todavía no están vinculados a un equipo.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={isPending}>
            Ahora no
          </Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Guardando..." : mode === "NEW" ? "Crear ticket" : "Vincular"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
