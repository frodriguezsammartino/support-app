"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

type Preset = { key: string; label: string; hoursAgo: number | null };

/**
 * Elegir "cuándo pasó" con un datetime completo es incómodo: hay que tipear hora
 * y minutos para algo que casi nunca importa. Estos atajos cubren el 90% de los
 * casos y, si hace falta una fecha vieja, aparece un calendario simple (sin hora).
 */
const PRESETS: Preset[] = [
  { key: "now", label: "Ahora", hoursAgo: 0 },
  { key: "1h", label: "Hace 1 hora", hoursAgo: 1 },
  { key: "today", label: "Hoy temprano", hoursAgo: null },
  { key: "yesterday", label: "Ayer", hoursAgo: null },
  { key: "custom", label: "Otra fecha", hoursAgo: null },
];

function startOfToday() {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
}

function yesterdayMorning() {
  const d = startOfToday();
  d.setDate(d.getDate() - 1);
  return d;
}

/** "YYYY-MM-DD" al mediodía local: la hora no importa y así no se corre de día. */
function fromDateValue(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function todayValue() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function WhenPicker({
  value,
  onChange,
}: {
  /** null = ahora (el servidor pone la hora actual). */
  value: Date | null;
  onChange: (value: Date | null) => void;
}) {
  const [selected, setSelected] = useState("now");
  const [customDate, setCustomDate] = useState("");
  const [maxDate] = useState(todayValue);

  function pick(preset: Preset) {
    setSelected(preset.key);

    if (preset.key === "now") return onChange(null);
    if (preset.key === "today") return onChange(startOfToday());
    if (preset.key === "yesterday") return onChange(yesterdayMorning());
    if (preset.key === "custom") return onChange(fromDateValue(customDate));

    const d = new Date();
    d.setHours(d.getHours() - (preset.hoursAgo ?? 0));
    onChange(d);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => {
          const on = selected === preset.key;
          return (
            <button
              key={preset.key}
              type="button"
              aria-pressed={on}
              onClick={() => pick(preset)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                on
                  ? "border-brand bg-brand-tint font-medium text-brand"
                  : "border-slate-300 bg-white text-ink-muted hover:bg-slate-50"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {selected === "custom" && (
        <Input
          type="date"
          className="h-9 w-44"
          max={maxDate}
          value={customDate}
          onChange={(e) => {
            setCustomDate(e.target.value);
            onChange(fromDateValue(e.target.value));
          }}
        />
      )}

      <p className="text-xs text-slate-400">
        {value ? value.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "Se usa la fecha y hora de ahora."}
      </p>
    </div>
  );
}
