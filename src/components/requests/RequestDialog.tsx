"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { createSpendRequest } from "@/lib/actions/requests";
import { CURRENCIES, parseMoneyToCents, type Currency } from "@/lib/licenses";
import { SPEND_KIND_OPTIONS, type SpendKind } from "@/lib/requests";
import { AssetPicker, type AssetOption } from "@/components/assets/AssetPicker";
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

type Line = { text: string; qty: string };

/**
 * Un solo formulario para todo lo que el técnico necesita pedir: mejorar algo,
 * cambiar lo que se rompió, reemplazar un equipo o comprar cosas del día a día.
 * Pide poco: qué se necesita, qué hay que hacer, un detalle y el costo. Solo una
 * compra lleva además la lista de lo que hay que comprar.
 */
export function RequestDialog({
  trigger,
  assets = [],
  assetId: initialAssetId = "",
  lockAsset = false,
  ticketId = null,
  initialKind = "UPGRADE",
  initialTitle = "",
  initialComponent = null,
}: {
  trigger: React.ReactElement;
  /** Los equipos entre los que se puede elegir. */
  assets?: AssetOption[];
  /** El equipo con el que arranca. */
  assetId?: string;
  /** Desde la ficha de un equipo no se cambia de equipo. */
  lockAsset?: boolean;
  /** Si se pide desde un ticket de reparación, queda enlazado a él. */
  ticketId?: string | null;
  initialKind?: SpendKind;
  initialTitle?: string;
  /** La pieza desde la que se abrió el pedido, si fue desde la lista de componentes. */
  initialComponent?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<SpendKind>(initialKind);
  const [assetId, setAssetId] = useState(initialAssetId);
  const [title, setTitle] = useState(initialTitle);
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [isPending, startTransition] = useTransition();

  const option = SPEND_KIND_OPTIONS.find((o) => o.value === kind) ?? SPEND_KIND_OPTIONS[0];
  const asset = assets.find((a) => a.id === assetId);
  const assetRequired = kind === "UPGRADE" || kind === "REPLACE";
  // Solo una compra lleva lista: un reemplazo, un cambio o una mejora se piden con una frase.
  const showLines = kind === "PURCHASE";

  function reset() {
    setKind(initialKind);
    setAssetId(initialAssetId);
    setTitle(initialTitle);
    setReason("");
    setLines([]);
    setCost("");
    setCurrency("ARS");
  }

  function addLine(text = "") {
    setLines((current) => [...current, { text, qty: "" }]);
  }

  function setLine(index: number, changes: Partial<Line>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...changes } : line)));
  }

  function submit() {
    if (cost.trim() && parseMoneyToCents(cost) == null) {
      toast.error("El costo estimado no es un número válido. Ejemplo: 45000");
      return;
    }
    startTransition(async () => {
      const result = await createSpendRequest({
        kind,
        assetId: assetId || null,
        ticketId,
        component: initialComponent,
        title,
        reason,
        items: showLines
          ? lines.map((l) => ({
              text: l.text,
              qty: Number(l.qty) > 0 ? Number(l.qty) : null,
            }))
          : [],
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
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nueva solicitud</DialogTitle>
          <DialogDescription>
            {asset && lockAsset ? `Para ${asset.name}. ` : ""}El administrador la evalúa y, si la
            aprueba, el gasto queda registrado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label>¿Qué necesitás?</Label>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {SPEND_KIND_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={kind === o.value}
                  onClick={() => setKind(o.value)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    kind === o.value
                      ? "border-brand bg-brand-tint font-medium text-brand"
                      : "border-slate-300 bg-white text-ink-muted hover:bg-slate-50"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-muted">{option.hint}</p>
          </div>

          {!lockAsset && assets.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label>Equipo{assetRequired ? "" : " (opcional)"}</Label>
              <AssetPicker assets={assets} value={assetId} onChange={setAssetId} />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>{kind === "PURCHASE" ? "¿Qué hay que comprar?" : "¿Qué hay que hacer?"}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={option.placeholder}
            />
          </div>

          {showLines && (
            <div className="flex flex-col gap-2 rounded-lg border bg-slate-50 p-3">
              <Label>Detalle de lo que hay que comprar (opcional)</Label>

              {lines.map((line, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={line.text}
                    onChange={(e) => setLine(index, { text: e.target.value })}
                    placeholder="Ej: Cable USB-C de 1 metro"
                    autoFocus={line.text === ""}
                  />
                  <Input
                    type="number"
                    min={1}
                    value={line.qty}
                    onChange={(e) => setLine(index, { qty: e.target.value })}
                    placeholder="Cant."
                    className="w-20"
                    aria-label="Cantidad"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title="Quitar"
                    aria-label="Quitar"
                    onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit"
                onClick={() => addLine()}
              >
                <Plus className="size-4" />
                Agregar un ítem
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>Detalle (opcional)</Label>
            <Textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: anda muy lenta; se rompió el cable; no tiene arreglo"
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
