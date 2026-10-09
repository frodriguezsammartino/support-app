"use client";

import { useState } from "react";
import {
  FREQ_UNIT_LABELS,
  MONTH_LABELS,
  NTH_WEEK_LABELS,
  PRESET_LABELS,
  WEEKDAY_INITIALS,
  WEEKDAY_LABELS,
  describeRecurrence,
  formatTimeOfDay,
  type EndType,
  type Freq,
  type MonthlyMode,
  type PresetKey,
  type Recurrence,
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

const PRESETS: PresetKey[] = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY", "CUSTOM"];
const UNITS: Freq[] = ["HOUR", "DAY", "WEEK", "MONTH", "YEAR"];

const END_LABELS: Record<EndType, string> = {
  NEVER: "Nunca",
  ON_DATE: "El día",
  AFTER_COUNT: "Después de",
};

const PRESET_FREQ: Record<Exclude<PresetKey, "CUSTOM">, Freq> = {
  DAILY: "DAY",
  WEEKLY: "WEEK",
  MONTHLY: "MONTH",
  YEARLY: "YEAR",
};

export const DEFAULT_RECURRENCE: Recurrence = {
  freq: "WEEK",
  interval: 1,
  timeOfDay: 8 * 60,
  weekdays: [1],
  monthlyMode: "DAY_OF_MONTH",
  monthDay: 1,
  nthWeek: 1,
  monthOfYear: 0,
  endType: "NEVER",
  endDate: null,
  endCount: null,
};

/** Un preset solo aplica si es "cada 1 <unidad>" y la unidad no es horas. */
function presetOf(recurrence: Recurrence): PresetKey {
  if (recurrence.interval !== 1 || recurrence.freq === "HOUR") return "CUSTOM";
  const entry = Object.entries(PRESET_FREQ).find(([, freq]) => freq === recurrence.freq);
  return (entry?.[0] as PresetKey) ?? "CUSTOM";
}

/** Date -> "YYYY-MM-DD" en hora de la clínica, para el input de fecha. */
function toDateValue(date: Date | null) {
  if (!date) return "";
  const shifted = new Date(date.getTime() - 3 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" -> fin de ese día en hora de la clínica, así la fecha elegida se incluye. */
function fromDateValue(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T23:59:00-03:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function timeValueToMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

function WeekdayPicker({
  selected,
  onToggle,
}: {
  selected: number[];
  onToggle: (weekday: number) => void;
}) {
  return (
    <div className="flex gap-1.5">
      {WEEKDAY_INITIALS.map((initial, weekday) => {
        const on = selected.includes(weekday);
        return (
          <button
            key={weekday}
            type="button"
            aria-pressed={on}
            aria-label={WEEKDAY_LABELS[weekday]}
            title={WEEKDAY_LABELS[weekday]}
            onClick={() => onToggle(weekday)}
            className={`size-8 rounded-full border text-sm transition-colors ${
              on
                ? "border-transparent bg-[#184f95] font-medium text-white"
                : "border-line bg-white text-ink-muted hover:bg-slate-100"
            }`}
          >
            {initial}
          </button>
        );
      })}
    </div>
  );
}

export function RecurrenceFields({
  initial = DEFAULT_RECURRENCE,
  onChange,
}: {
  initial?: Recurrence;
  onChange: (recurrence: Recurrence) => void;
}) {
  const [recurrence, setRecurrence] = useState<Recurrence>(initial);
  const [preset, setPreset] = useState<PresetKey>(presetOf(initial));
  const [endDateValue, setEndDateValue] = useState(toDateValue(initial.endDate));

  function patch(changes: Partial<Recurrence>) {
    const next = { ...recurrence, ...changes };
    setRecurrence(next);
    onChange(next);
  }

  function applyPreset(next: PresetKey) {
    setPreset(next);
    if (next !== "CUSTOM") patch({ freq: PRESET_FREQ[next], interval: 1 });
  }

  function toggleWeekday(weekday: number) {
    const has = recurrence.weekdays.includes(weekday);
    const next = has
      ? recurrence.weekdays.filter((d) => d !== weekday)
      : [...recurrence.weekdays, weekday];
    // Dejar la semana sin ningún día marcado no significa nada: se queda el último.
    patch({ weekdays: next.length ? next.sort((a, b) => a - b) : recurrence.weekdays });
  }

  const showWeekdays = recurrence.freq === "WEEK";
  const showMonthly = recurrence.freq === "MONTH";
  const showYearly = recurrence.freq === "YEAR";
  const showTime = recurrence.freq !== "HOUR";

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-slate-50 p-3">
      <div className="flex flex-col gap-2">
        <Label>Se repite</Label>
        <Select value={preset} onValueChange={(v) => v && applyPreset(v as PresetKey)}>
          <SelectTrigger className="w-full">
            <SelectValue>{(v: string) => PRESET_LABELS[v as PresetKey]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p} value={p}>
                {PRESET_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {preset === "CUSTOM" && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-2">
            <Label>Se repite cada</Label>
            <Input
              type="number"
              min={1}
              max={999}
              className="w-20"
              value={String(recurrence.interval)}
              onChange={(e) => patch({ interval: Math.max(1, Number(e.target.value) || 1) })}
            />
          </div>
          <Select value={recurrence.freq} onValueChange={(v) => v && patch({ freq: v as Freq })}>
            <SelectTrigger className="w-32">
              <SelectValue>
                {(v: string) =>
                  recurrence.interval === 1
                    ? FREQ_UNIT_LABELS[v as Freq].one
                    : FREQ_UNIT_LABELS[v as Freq].many
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => (
                <SelectItem key={u} value={u}>
                  {recurrence.interval === 1 ? FREQ_UNIT_LABELS[u].one : FREQ_UNIT_LABELS[u].many}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showWeekdays && (
        <div className="flex flex-col gap-2">
          <Label>Se repite el</Label>
          <WeekdayPicker selected={recurrence.weekdays} onToggle={toggleWeekday} />
        </div>
      )}

      {showMonthly && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-2">
            <Label>Se repite el</Label>
            <Select
              value={recurrence.monthlyMode ?? "DAY_OF_MONTH"}
              onValueChange={(v) => v && patch({ monthlyMode: v as MonthlyMode })}
            >
              <SelectTrigger className="w-44">
                <SelectValue>
                  {(v: string) => (v === "NTH_WEEKDAY" ? "Un día de semana" : "Un día del mes")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAY_OF_MONTH">Un día del mes</SelectItem>
                <SelectItem value="NTH_WEEKDAY">Un día de semana</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recurrence.monthlyMode === "NTH_WEEKDAY" ? (
            <>
              <Select
                value={String(recurrence.nthWeek ?? 1)}
                onValueChange={(v) => v && patch({ nthWeek: Number(v) })}
              >
                <SelectTrigger className="w-32">
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
              <Select
                value={String(recurrence.weekdays[0] ?? 1)}
                onValueChange={(v) => v && patch({ weekdays: [Number(v)] })}
              >
                <SelectTrigger className="w-36">
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
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <Label>Día</Label>
              <Input
                type="number"
                min={1}
                max={31}
                className="w-20"
                value={String(recurrence.monthDay ?? 1)}
                onChange={(e) =>
                  patch({ monthDay: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })
                }
              />
            </div>
          )}
        </div>
      )}

      {showYearly && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-2">
            <Label>Se repite el</Label>
            <Input
              type="number"
              min={1}
              max={31}
              className="w-20"
              value={String(recurrence.monthDay ?? 1)}
              onChange={(e) =>
                patch({ monthDay: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })
              }
            />
          </div>
          <Select
            value={String(recurrence.monthOfYear ?? 0)}
            onValueChange={(v) => v && patch({ monthOfYear: Number(v) })}
          >
            <SelectTrigger className="w-40">
              <SelectValue>{(v: string) => MONTH_LABELS[Number(v)]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MONTH_LABELS.map((label, index) => (
                <SelectItem key={label} value={String(index)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showTime && (
        <div className="flex flex-col gap-2">
          <Label>A las</Label>
          <Input
            type="time"
            className="w-32"
            value={formatTimeOfDay(recurrence.timeOfDay ?? 0)}
            onChange={(e) => patch({ timeOfDay: timeValueToMinutes(e.target.value) })}
          />
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t pt-3">
        <div className="flex flex-col gap-2">
          <Label>Finaliza</Label>
          <Select
            value={recurrence.endType}
            onValueChange={(v) => v && patch({ endType: v as EndType })}
          >
            <SelectTrigger className="w-40">
              <SelectValue>{(v: string) => END_LABELS[v as EndType]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NEVER">Nunca</SelectItem>
              <SelectItem value="ON_DATE">El día</SelectItem>
              <SelectItem value="AFTER_COUNT">Después de</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {recurrence.endType === "ON_DATE" && (
          <Input
            type="date"
            className="w-44"
            value={endDateValue}
            onChange={(e) => {
              setEndDateValue(e.target.value);
              patch({ endDate: fromDateValue(e.target.value) });
            }}
          />
        )}

        {recurrence.endType === "AFTER_COUNT" && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={999}
              className="w-20"
              value={String(recurrence.endCount ?? 1)}
              onChange={(e) => patch({ endCount: Math.max(1, Number(e.target.value) || 1) })}
            />
            <span className="pb-2 text-sm text-ink-muted">repeticiones</span>
          </div>
        )}
      </div>

      <p className="text-xs text-ink-muted">{describeRecurrence(recurrence)}</p>
    </div>
  );
}
