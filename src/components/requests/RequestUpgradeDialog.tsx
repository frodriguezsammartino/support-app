"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wrench } from "lucide-react";
import { toast } from "sonner";
import { createUpgradeRequest } from "@/lib/actions/requests";
import { CURRENCIES, parseMoneyToCents, type Currency } from "@/lib/licenses";
import { UPGRADE_COMPONENTS, type UpgradeComponent } from "@/lib/requests";
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

/**
 * "Esta PC anda lenta, hay que ampliar la RAM": el técnico lo pide desde la ficha
 * del equipo y el admin decide. Si aprueba, el costo queda como gasto.
 */
export function RequestUpgradeDialog({
  assetId,
  assetName,
}: {
  assetId: string;
  assetName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [component, setComponent] = useState<UpgradeComponent>("RAM");
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setComponent("RAM");
    setTitle("");
    setReason("");
    setCost("");
    setCurrency("ARS");
  }

  function submit() {
    if (cost.trim() && parseMoneyToCents(cost) == null) {
      toast.error("El costo estimado no es un número válido. Ejemplo: 45000");
      return;
    }
    startTransition(async () => {
      const result = await createUpgradeRequest({
        assetId,
        component,
        title,
        reason,
        estimatedCostCents: parseMoneyToCents(cost),
        currency,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Solicitud enviada. El administrador la va a revisar.");
      reset();
      setOpen(false);
      router.refresh();
    });
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
          <Button variant="outline" size="sm">
            <Wrench className="size-4" />
            Solicitar mejora
          </Button>
        }
      />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Solicitar una mejora</DialogTitle>
          <DialogDescription>
            Para {assetName}. El administrador la evalúa y, si la aprueba, el gasto queda
            registrado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label>¿Qué componente?</Label>
            <div className="flex flex-wrap gap-1.5">
              {UPGRADE_COMPONENTS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={component === c.value}
                  onClick={() => setComponent(c.value)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                    component === c.value
                      ? "border-brand bg-brand-tint font-medium text-brand"
                      : "border-slate-300 bg-white text-ink-muted hover:bg-slate-50"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>¿Qué hay que hacer?</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Ampliar la RAM de 4 a 8 GB"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>¿Por qué hace falta?</Label>
            <Textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: anda muy lenta, tarda varios minutos en abrir el sistema"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Costo estimado (opcional)</Label>
              <Input
                inputMode="decimal"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Moneda</Label>
              <Select value={currency} onValueChange={(v) => v && setCurrency(v as Currency)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: string) => v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Enviando..." : "Enviar solicitud"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
