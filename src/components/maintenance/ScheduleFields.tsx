"use client";

import { useState } from "react";
import {
  DAY_HOURS,
  NTH_WEEK_LABELS,
  SCHEDULE_TYPE_LABELS,
  WEEKDAY_LABELS,
  WEEK_HOURS,
  hoursToUnit,
  unitToHours,
  type FrequencyUnit,
  type Schedule,
  type ScheduleType,
} from "@/lib/maintenance";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UNIT_LABELS: Record<FrequencyUnit, string> = {
  HOURS: "Horas",
  DAYS: "Días",
  WEEKS: "Semanas",
};

const SCHEDULE_TYPES: ScheduleType[] = [
  "DAILY",
  "WEEKLY",
  "MONTHLY_DAY",
  "MONTHLY_NTH_WEEKDAY",
  "INTERVAL",
];

function minutesToTimeValue(minutes: number) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function timeValueToMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export const DEFAULT_SCHEDULE: Schedule = {
  scheduleType: "WEEKLY",
  intervalHours: WEEK_HOURS,
  timeOfDay: 8 * 60,
  weekday: 1,
  monthDay: 1,
  nthWeek: 1,
};

export function ScheduleFields({
  initial = DEFAULT_SCHEDULE,
  onChange,
}: {
  initial?: Schedule;
  onChange: (schedule: Schedule) => void;
}) {
  // Se arranca con todos los campos poblados (no solo los del tipo activo) para que
  // cambiar de tipo y volver no pierda lo que ya se había elegido.
  const [schedule, setSchedule] = useState<Schedule>({
    scheduleType: initial.scheduleType,
    intervalHours: initial.intervalHours,
    timeOfDay: initial.timeOfDay ?? 8 * 60,
    weekday: initial.weekday ?? 1,
    monthDay: initial.monthDay ?? 1,
    nthWeek: initial.nthWeek ?? 1,
  });

  const initialCustom = hoursToUnit(
    initial.scheduleType === "INTERVAL" ? initial.intervalHours : DAY_HOURS
  );
  const [customValue, setCustomValue] = useState(String(initialCustom.value));
  const [customUnit, setCustomUnit] = useState<FrequencyUnit>(initialCustom.unit);

  function patch(changes: Partial<Schedule>) {
    const next = { ...schedule, ...changes };
    setSchedule(next);
    onChange(next);
  }

  function patchCustom(value: string, unit: FrequencyUnit) {
    setCustomValue(value);
    setCustomUnit(unit);
    patch({ intervalHours: unitToHours(Number(value) || 1, unit) });
  }

  const showTime = schedule.scheduleType !== "INTERVAL";
  const showWeekday =
    schedule.scheduleType === "WEEKLY" || schedule.scheduleType === "MONTHLY_NTH_WEEKDAY";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label>¿Cada cuánto se repite?</Label>
        <Select
          value={schedule.scheduleType}
          onValueChange={(v) => v && patch({ scheduleType: v as ScheduleType })}
        >
          <SelectTrigger className="w-full">
            <SelectValue>{(v: string) => SCHEDULE_TYPE_LABELS[v as ScheduleType]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SCHEDULE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {SCHEDULE_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-3">
        {schedule.scheduleType === "MONTHLY_NTH_WEEKDAY" && (
          <div className="flex flex-col gap-2">
            <Label>Semana</Label>
            <Select
              value={String(schedule.nthWeek ?? 1)}
              onValueChange={(v) => v && patch({ nthWeek: Number(v) })}
            >
              <SelectTrigger className="w-36">
                <SelectValue>{(v: string) => NTH_WEEK_LABELS[Number(v)] ?? "primer"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {NTH_WEEK_LABELS[n]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {showWeekday && (
          <div className="flex flex-col gap-2">
            <Label>Día</Label>
            <Select
              value={String(schedule.weekday ?? 1)}
              onValueChange={(v) => v && patch({ weekday: Number(v) })}
            >
              <SelectTrigger className="w-40">
                <SelectValue>{(v: string) => WEEKDAY_LABELS[Number(v)]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {WEEKDAY_LABELS.map((label, index) => (
                  <SelectItem key={label} value={String(index)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {schedule.scheduleType === "MONTHLY_DAY" && (
          <div className="flex flex-col gap-2">
            <Label>Día del mes</Label>
            <Input
              type="number"
              min={1}
              max={31}
              className="w-24"
              value={String(schedule.monthDay ?? 1)}
              onChange={(e) => patch({ monthDay: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })}
            />
          </div>
        )}

        {showTime && (
          <div className="flex flex-col gap-2">
            <Label>Hora</Label>
            <Input
              type="time"
              className="w-32"
              value={minutesToTimeValue(schedule.timeOfDay ?? 0)}
              onChange={(e) => patch({ timeOfDay: timeValueToMinutes(e.target.value) })}
            />
          </div>
        )}

        {schedule.scheduleType === "INTERVAL" && (
          <div className="flex flex-col gap-2">
            <Label>Cada</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                className="w-24"
                value={customValue}
                onChange={(e) => patchCustom(e.target.value, customUnit)}
              />
              <Select
                value={customUnit}
                onValueChange={(v) => v && patchCustom(customValue, v as FrequencyUnit)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue>{(v: string) => UNIT_LABELS[v as FrequencyUnit]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOURS">Horas</SelectItem>
                  <SelectItem value="DAYS">Días</SelectItem>
                  <SelectItem value="WEEKS">Semanas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {schedule.monthDay != null &&
        schedule.monthDay > 28 &&
        schedule.scheduleType === "MONTHLY_DAY" && (
          <p className="text-xs text-zinc-500">
            En los meses más cortos se va a tomar el último día del mes.
          </p>
        )}
    </div>
  );
}
