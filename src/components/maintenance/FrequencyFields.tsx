"use client";

import { useState } from "react";
import { DAY_HOURS, WEEK_HOURS, hoursToUnit, unitToHours, type FrequencyUnit } from "@/lib/maintenance";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Preset = "DAILY" | "WEEKLY" | "CUSTOM";

const UNIT_LABELS: Record<FrequencyUnit, string> = {
  HOURS: "Horas",
  DAYS: "Días",
  WEEKS: "Semanas",
};

export function FrequencyFields({
  initialHours = DAY_HOURS,
  onChange,
}: {
  initialHours?: number;
  onChange: (hours: number) => void;
}) {
  const [preset, setPreset] = useState<Preset>(
    initialHours === DAY_HOURS ? "DAILY" : initialHours === WEEK_HOURS ? "WEEKLY" : "CUSTOM"
  );
  const initialCustom = hoursToUnit(initialHours);
  const [customValue, setCustomValue] = useState(preset === "CUSTOM" ? String(initialCustom.value) : "1");
  const [customUnit, setCustomUnit] = useState<FrequencyUnit>(preset === "CUSTOM" ? initialCustom.unit : "HOURS");

  function applyPreset(next: Preset) {
    setPreset(next);
    if (next === "DAILY") onChange(DAY_HOURS);
    if (next === "WEEKLY") onChange(WEEK_HOURS);
    if (next === "CUSTOM") onChange(unitToHours(Number(customValue) || 1, customUnit));
  }

  function applyCustom(value: string, unit: FrequencyUnit) {
    setCustomValue(value);
    setCustomUnit(unit);
    onChange(unitToHours(Number(value) || 1, unit));
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Frecuencia</Label>
      <Select value={preset} onValueChange={(v) => v && applyPreset(v as Preset)}>
        <SelectTrigger className="w-full">
          <SelectValue>
            {(v: string) =>
              v === "DAILY" ? "Diaria" : v === "WEEKLY" ? "Semanal" : "Personalizada"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="DAILY">Diaria</SelectItem>
          <SelectItem value="WEEKLY">Semanal</SelectItem>
          <SelectItem value="CUSTOM">Personalizada</SelectItem>
        </SelectContent>
      </Select>

      {preset === "CUSTOM" && (
        <div className="flex gap-2">
          <Input
            type="number"
            min={1}
            value={customValue}
            onChange={(e) => applyCustom(e.target.value, customUnit)}
            className="w-24"
          />
          <Select value={customUnit} onValueChange={(v) => v && applyCustom(customValue, v as FrequencyUnit)}>
            <SelectTrigger className="flex-1">
              <SelectValue>{(v: string) => UNIT_LABELS[v as FrequencyUnit]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HOURS">Horas</SelectItem>
              <SelectItem value="DAYS">Días</SelectItem>
              <SelectItem value="WEEKS">Semanas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
