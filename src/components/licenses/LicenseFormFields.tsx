"use client";

import {
  BILLING_LABELS,
  PRICING_HINTS,
  PRICING_LABELS,
  PRICING_ORDER,
  formatAmount,
  parseMoneyToCents,
  BILLING_ORDER,
  CURRENCIES,
  LICENSE_STATUS_META,
  LICENSE_STATUS_ORDER,
  type Currency,
  type LicenseBilling,
  type LicensePricing,
  type LicenseStatus,
} from "@/lib/licenses";
import { Check } from "lucide-react";
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

export type LicenseFormValues = {
  name: string;
  vendor: string;
  seatsTotal: string;
  seatsAssigned: string;
  cost: string;
  currency: Currency;
  billing: LicenseBilling;
  pricing: LicensePricing;
  expiresAt: string;
  autoRenew: boolean;
  status: LicenseStatus;
  notes: string;
};

export const EMPTY_LICENSE_FORM: LicenseFormValues = {
  name: "",
  vendor: "",
  seatsTotal: "1",
  seatsAssigned: "0",
  cost: "",
  currency: "ARS",
  billing: "YEARLY",
  pricing: "PER_SEAT",
  expiresAt: "",
  autoRenew: false,
  status: "ACTIVE",
  notes: "",
};

export function toDateInput(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

/** "YYYY-MM-DD" -> mediodía UTC, para que el día no se corra por zona horaria. */
export function fromDateInput(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function LicenseFormFields({
  values,
  onChange,
}: {
  values: LicenseFormValues;
  onChange: (changes: Partial<LicenseFormValues>) => void;
}) {
  const total = Number(values.seatsTotal) || 0;
  const assigned = Number(values.seatsAssigned) || 0;
  const available = total - assigned;

  // Vista previa de lo que se paga: evita equivocarse al elegir cómo se cobra.
  const unitCents = parseMoneyToCents(values.cost);
  const perPeriodCents =
    unitCents == null ? null : values.pricing === "PER_SEAT" ? unitCents * total : unitCents;
  const wastedCents =
    unitCents == null || values.pricing !== "PER_SEAT"
      ? 0
      : unitCents * Math.max(0, available);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label>Licencia</Label>
        <Input
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Ej: Microsoft 365 Business Standard"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Proveedor (opcional)</Label>
          <Input
            value={values.vendor}
            onChange={(e) => onChange({ vendor: e.target.value })}
            placeholder="Ej: Microsoft"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Estado</Label>
          <Select
            value={values.status}
            onValueChange={(v) => v && onChange({ status: v as LicenseStatus })}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{(v: string) => LICENSE_STATUS_META[v as LicenseStatus].label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LICENSE_STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {LICENSE_STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-slate-50 p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Puestos que pagamos</Label>
            <Input
              type="number"
              min={1}
              value={values.seatsTotal}
              onChange={(e) => onChange({ seatsTotal: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Puestos en uso</Label>
            <Input
              type="number"
              min={0}
              value={values.seatsAssigned}
              onChange={(e) => onChange({ seatsAssigned: e.target.value })}
            />
          </div>
        </div>
        <p className="mt-2 text-xs">
          {available < 0 ? (
            <span className="font-medium text-[#991B1B]">
              Hay {Math.abs(available)} puesto{Math.abs(available) === 1 ? "" : "s"} de más en uso:
              estás usando más de lo que pagás.
            </span>
          ) : (
            <span className="text-ink-muted">
              Quedan <span className="font-medium">{available}</span> puesto
              {available === 1 ? "" : "s"} disponible{available === 1 ? "" : "s"}.
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>¿Cómo se cobra?</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {PRICING_ORDER.map((p) => {
            const selected = values.pricing === p;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange({ pricing: p })}
                className={`flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  selected
                    ? "border-brand bg-brand-tint"
                    : "border-slate-300 bg-white hover:bg-slate-50"
                }`}
              >
                <span className="text-sm font-medium text-ink">{PRICING_LABELS[p]}</span>
                <span className="text-xs leading-snug text-ink-muted">{PRICING_HINTS[p]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label>
            {values.pricing === "PER_SEAT" ? "Costo por puesto" : "Costo total"} (opcional)
          </Label>
          <Input
            inputMode="decimal"
            value={values.cost}
            onChange={(e) => onChange({ cost: e.target.value })}
            placeholder="0,00"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Moneda</Label>
          <Select
            value={values.currency}
            onValueChange={(v) => v && onChange({ currency: v as Currency })}
          >
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

        <div className="flex flex-col gap-2">
          <Label>Cada cuánto se paga</Label>
          <Select
            value={values.billing}
            onValueChange={(v) => v && onChange({ billing: v as LicenseBilling })}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{(v: string) => BILLING_LABELS[v as LicenseBilling]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {BILLING_ORDER.map((b) => (
                <SelectItem key={b} value={b}>
                  {BILLING_LABELS[b]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {perPeriodCents != null && perPeriodCents > 0 && (
        <div className="rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm">
          <span className="text-ink-muted">Se paga </span>
          <span className="font-semibold text-ink">
            {values.currency} {formatAmount(perPeriodCents)}
          </span>
          <span className="text-ink-muted">
            {values.billing === "MONTHLY"
              ? " por mes"
              : values.billing === "YEARLY"
                ? " por año"
                : " una sola vez"}
          </span>
          {values.pricing === "PER_SEAT" && total > 0 && (
            <span className="text-ink-muted">
              {" "}
              ({values.currency} {formatAmount(unitCents ?? 0)} × {total} puestos)
            </span>
          )}
          {wastedCents > 0 && (
            <p className="mt-1 text-xs font-medium text-[#991B1B]">
              {values.currency} {formatAmount(wastedCents)} se pagan por {available} puesto
              {available === 1 ? "" : "s"} que nadie usa.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <Label>{values.autoRenew ? "Próxima renovación" : "Vence el"} (opcional)</Label>
          <Input
            type="date"
            className="w-44"
            value={values.expiresAt}
            onChange={(e) => onChange({ expiresAt: e.target.value })}
          />
        </div>

        <button
          type="button"
          aria-pressed={values.autoRenew}
          onClick={() => onChange({ autoRenew: !values.autoRenew })}
          className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-sm transition-colors ${
            values.autoRenew
              ? "border-[#184f95] bg-[#eaf2fc] text-[#184f95]"
              : "border-line bg-white text-ink-muted hover:bg-slate-100"
          }`}
        >
          <span
            className={`flex size-4 items-center justify-center rounded border ${
              values.autoRenew ? "border-[#184f95] bg-[#184f95] text-white" : "border-zinc-300"
            }`}
          >
            {values.autoRenew && <Check className="size-3" />}
          </span>
          Se renueva sola
        </button>
      </div>

      <p className="-mt-1 text-xs text-ink-muted">
        {values.autoRenew
          ? "Se cobra sola, no hay que hacer nada al vencer. Igual se usa la fecha para saber cuándo cae la factura."
          : "Hay que renovarla a mano: va a aparecer como vencida o por vencer."}
      </p>

      <div className="flex flex-col gap-2">
        <Label>Notas (opcional)</Label>
        <Textarea
          rows={2}
          value={values.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Ej: con quién se contrata, número de cliente, a quién está asignada"
        />
      </div>
    </div>
  );
}
