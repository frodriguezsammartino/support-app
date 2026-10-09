"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createInternalTicket } from "@/lib/actions/tickets";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY_META, PRIORITY_ORDER } from "@/lib/priority";
import { AssetPicker, type AssetOption } from "@/components/assets/AssetPicker";
import { WhenPicker } from "@/components/ui/when-picker";
import type { TicketPriority } from "@prisma/client";

const EMPTY = {
  title: "",
  description: "",
  reporterName: "",
  categoryId: "",
  priority: "" as TicketPriority | "",
  assetId: "",
};

export function NewInternalTicketDialog({
  categories,
  assets,
}: {
  categories: { id: string; name: string }[];
  assets: AssetOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [when, setWhen] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();
  const categoryLabels = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  function update<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setForm(EMPTY);
          setWhen(null);
        }
        setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" />
            Nuevo ticket
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo ticket para vos</DialogTitle>
          <DialogDescription>
            Cargá una tarea propia (no reportada por nadie). Queda en el mismo Pendientes que el resto.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label>¿Qué hay que hacer?</Label>
            <Input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Ej: Actualizar el firmware del router"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Más detalle (opcional)</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Tu nombre (opcional)</Label>
            <Input
              value={form.reporterName}
              onChange={(e) => update("reporterName", e.target.value)}
              placeholder="Técnico"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Categoría</Label>
              <Select value={form.categoryId} onValueChange={(v) => v && update("categoryId", v)}>
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
              <Select
                value={form.priority}
                onValueChange={(v) => v && update("priority", v as TicketPriority)}
              >
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

          <div className="flex flex-col gap-2">
            <Label>¿Cuándo pasó?</Label>
            <WhenPicker value={when} onChange={setWhen} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Equipo (opcional)</Label>
            <AssetPicker
              assets={assets}
              value={form.assetId}
              onChange={(v) => update("assetId", v)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            disabled={isPending}
            onClick={() => {
              if (!form.title || !form.categoryId || !form.priority) {
                toast.error("Completá qué hay que hacer, categoría y urgencia.");
                return;
              }
              startTransition(async () => {
                const result = await createInternalTicket({
                  title: form.title,
                  description: form.description || undefined,
                  categoryId: form.categoryId,
                  priority: form.priority as TicketPriority,
                  reporterName: form.reporterName || undefined,
                  assetId: form.assetId || undefined,
                  createdAt: when ?? undefined,
                });
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                setForm(EMPTY);
                setOpen(false);
                router.refresh();
              });
            }}
          >
            {isPending ? "Guardando..." : "Crear ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
