"use client";

import {
  BILLING_LABELS,
  BILLING_ORDER,
  CURRENCIES,
  LICENSE_STATUS_META,
  LICENSE_STATUS_ORDER,
  type Currency,
  type LicenseBilling,
  type LicenseStatus,
} from "@/lib/licenses";
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
  expiresAt: string;
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
  expiresAt: "",
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

      <div className="rounded-lg border bg-zinc-50/60 p-3">
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
            <span className="font-medium text-red-700">
              Hay {Math.abs(available)} puesto{Math.abs(available) === 1 ? "" : "s"} de más en uso:
              estás usando más de lo que pagás.
            </span>
          ) : (
            <span className="text-zinc-600">
              Quedan <span className="font-medium">{available}</span> puesto
              {available === 1 ? "" : "s"} disponible{available === 1 ? "" : "s"}.
            </span>
          )}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label>Costo (opcional)</Label>
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

      <div className="flex flex-col gap-2">
        <Label>Vence el (opcional)</Label>
        <Input
          type="date"
          className="w-44"
          value={values.expiresAt}
          onChange={(e) => onChange({ expiresAt: e.target.value })}
        />
      </div>

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
