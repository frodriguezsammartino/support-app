"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { resolveRequest } from "@/lib/actions/requests";
import {
  CURRENCIES,
  centsToInput,
  formatAmount,
  parseMoneyToCents,
  type Currency,
} from "@/lib/licenses";
import { RETIRE_CONSEQUENCE, type RequestKind, type RetireTarget } from "@/lib/requests";
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

export type ResolvableRequest = {
  id: string;
  kind: RequestKind;
  title: string;
  targetLabel: string;
  /** Qué se da de baja; solo para RETIRE. */
  retireTarget: RetireTarget | null;
  estimatedCostCents: number | null;
  currency: string;
  canCreateTicket: boolean;
};

/**
 * Aprobar o rechazar. Aprobar una baja avisa antes qué pasa de verdad (no es lo
 * mismo borrar un equipo que dar de baja una licencia); aprobar una mejora pide
 * el costo final, que es lo que queda como gasto.
 */
export function ResolveRequestDialog({
  request,
  decision,
}: {
  request: ResolvableRequest;
  decision: "APPROVE" | "REJECT";
}) {
  const router = useRouter();
  const approve = decision === "APPROVE";
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [cost, setCost] = useState(centsToInput(request.estimatedCostCents));
  const [currency, setCurrency] = useState<Currency>(request.currency === "USD" ? "USD" : "ARS");
  const [createTicket, setCreateTicket] = useState(request.canCreateTicket);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (approve && request.kind === "UPGRADE" && cost.trim() && parseMoneyToCents(cost) == null) {
      toast.error("El costo no es un número válido. Ejemplo: 45000");
      return;
    }
    startTransition(async () => {
      const result = await resolveRequest(request.id, {
        decision,
        costCents: approve && request.kind === "UPGRADE" ? parseMoneyToCents(cost) : null,
        currency,
        note,
        createTicket: approve && request.kind === "UPGRADE" ? createTicket : false,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(approve ? "Solicitud aprobada." : "Solicitud rechazada.");
      setOpen(false);
      router.refresh();
    });
  }

  const costCents = parseMoneyToCents(cost);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          approve ? (
            <Button size="sm">
              <Check className="size-4" />
              Aprobar
            </Button>
          ) : (
            <Button size="sm" variant="outline">
              <X className="size-4" />
              Rechazar
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{approve ? "Aprobar la solicitud" : "Rechazar la solicitud"}</DialogTitle>
          <DialogDescription>
            {request.title}
            {request.kind === "UPGRADE" && ` · ${request.targetLabel}`}
          </DialogDescription>
        </DialogHeader>

        {approve && request.kind === "RETIRE" && request.retireTarget && (
          <p className="rounded-lg border border-[#FCD34D] bg-[#FFFBEB] px-3 py-2 text-sm text-[#92400E]">
            {RETIRE_CONSEQUENCE[request.retireTarget]}
          </p>
        )}

        {approve && request.kind === "UPGRADE" && (
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Costo final (opcional)</Label>
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
            <p className="text-xs text-ink-muted">
              {costCents && costCents > 0
                ? `Queda registrado como gasto de mantenimiento: ${currency} ${formatAmount(costCents)}.`
                : "Sin costo no suma a los gastos (por ejemplo, si el repuesto ya estaba en stock)."}
            </p>

            {request.canCreateTicket && (
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={createTicket}
                  onChange={(e) => setCreateTicket(e.target.checked)}
                  className="size-4 accent-[#075573]"
                />
                Crear un ticket para que el técnico la haga y quede el seguimiento
              </label>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label>Comentario (opcional)</Label>
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={approve ? "Ej: comprar en Compumundo" : "Ej: esperemos al próximo mes"}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Guardando..." : approve ? "Aprobar" : "Rechazar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
