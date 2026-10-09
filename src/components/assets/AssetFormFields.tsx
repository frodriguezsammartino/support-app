"use client";

import {
  hasOwner,
  ASSET_STATUS_META,
  ASSET_STATUS_ORDER,
  ASSET_TYPE_LABELS,
  ASSET_TYPE_ORDER,
  type AssetStatus,
  type AssetType,
} from "@/lib/assets";
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

export type AssetFormValues = {
  name: string;
  type: AssetType;
  status: AssetStatus;
  brand: string;
  model: string;
  serialNumber: string;
  location: string;
  owner: string;
  purchasedAt: string;
  warrantyUntil: string;
  notes: string;
};

export const EMPTY_ASSET_FORM: AssetFormValues = {
  name: "",
  type: "PC",
  status: "ACTIVE",
  brand: "",
  model: "",
  serialNumber: "",
  location: "",
  owner: "",
  purchasedAt: "",
  warrantyUntil: "",
  notes: "",
};

/** Date -> "YYYY-MM-DD" para el input de fecha. */
export function toDateInput(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

/** "YYYY-MM-DD" -> mediodía UTC, para que el día no se corra por zona horaria. */
export function fromDateInput(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function AssetFormFields({
  values,
  onChange,
}: {
  values: AssetFormValues;
  onChange: (changes: Partial<AssetFormValues>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label>Equipo</Label>
        <Input
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Ej: PC de recepción"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Tipo</Label>
          <Select value={values.type} onValueChange={(v) => v && onChange({ type: v as AssetType })}>
            <SelectTrigger className="w-full">
              <SelectValue>{(v: string) => ASSET_TYPE_LABELS[v as AssetType]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ASSET_TYPE_ORDER.map((t) => (
                <SelectItem key={t} value={t}>
                  {ASSET_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Estado</Label>
          <Select
            value={values.status}
            onValueChange={(v) => v && onChange({ status: v as AssetStatus })}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{(v: string) => ASSET_STATUS_META[v as AssetStatus].label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ASSET_STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {ASSET_STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Ubicación (opcional)</Label>
          <Input
            value={values.location}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder="Ej: Consultorio 3"
          />
        </div>

        {/* Solo los equipos personales tienen un responsable; un router no. */}
        {hasOwner(values.type) && (
          <div className="flex flex-col gap-2">
            <Label>Responsable (opcional)</Label>
            <Input
              value={values.owner}
              onChange={(e) => onChange({ owner: e.target.value })}
              placeholder="Ej: Dra. Gómez"
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label>Número de serie (opcional)</Label>
          <Input
            value={values.serialNumber}
            onChange={(e) => onChange({ serialNumber: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Marca (opcional)</Label>
          <Input value={values.brand} onChange={(e) => onChange({ brand: e.target.value })} />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Modelo (opcional)</Label>
          <Input value={values.model} onChange={(e) => onChange({ model: e.target.value })} />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Fecha de compra (opcional)</Label>
          <Input
            type="date"
            value={values.purchasedAt}
            onChange={(e) => onChange({ purchasedAt: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Garantía hasta (opcional)</Label>
          <Input
            type="date"
            value={values.warrantyUntil}
            onChange={(e) => onChange({ warrantyUntil: e.target.value })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Notas (opcional)</Label>
        <Textarea
          rows={2}
          value={values.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Lo que convenga recordar de este equipo"
        />
      </div>
    </div>
  );
}
