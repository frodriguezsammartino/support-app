import { PILL, ROW_TINT, STATE_TEXT } from "./pills";

export const DUE_SOON_RATIO = 0.2;
export const HOUR_MS = 3_600_000;

/**
 * La clínica está en Argentina, que no tiene horario de verano: el offset es
 * -03:00 todo el año. Con un offset fijo la aritmética de "las 8 de la mañana"
 * es exacta sin arrastrar una librería de zonas horarias.
 */
const CLINIC_OFFSET_MS = -3 * HOUR_MS;

/** Tope de ciclos a recorrer al buscar la próxima ocurrencia. Nunca debería hacer falta. */
const MAX_CYCLES = 500;

export type MaintenanceStatusKey = "OK" | "DUE_SOON" | "OVERDUE" | "FINISHED";

export const MAINTENANCE_STATUS_META: Record<
  MaintenanceStatusKey,
  { label: string; badgeClass: string; dot: string; rowClass: string; textClass: string }
> = {
  OK: {
    label: "Al día",
    badgeClass: PILL.success,
    dot: "bg-[#16A34A]",
    rowClass: "",
    textClass: "text-ink-muted",
  },
  DUE_SOON: {
    label: "Vence pronto",
    badgeClass: PILL.warning,
    dot: "bg-[#F59E0B]",
    rowClass: ROW_TINT.warning,
    textClass: STATE_TEXT.warning,
  },
  OVERDUE: {
    label: "Vencida",
    badgeClass: PILL.danger,
    dot: "bg-[#DC2626]",
    rowClass: ROW_TINT.danger,
    textClass: STATE_TEXT.danger,
  },
  FINISHED: {
    label: "Terminada",
    badgeClass: PILL.neutral,
    dot: "bg-[#64748B]",
    rowClass: ROW_TINT.muted,
    textClass: STATE_TEXT.muted,
  },
};

export type Freq = "HOUR" | "DAY" | "WEEK" | "MONTH" | "YEAR";
export type MonthlyMode = "DAY_OF_MONTH" | "NTH_WEEKDAY";
export type EndType = "NEVER" | "ON_DATE" | "AFTER_COUNT";

export const FREQ_UNIT_LABELS: Record<Freq, { one: string; many: string }> = {
  HOUR: { one: "hora", many: "horas" },
  DAY: { one: "día", many: "días" },
  WEEK: { one: "semana", many: "semanas" },
  MONTH: { one: "mes", many: "meses" },
  YEAR: { one: "año", many: "años" },
};

/** Etiquetas de los presets, al estilo del calendario. */
export const PRESET_LABELS = {
  DAILY: "Todos los días",
  WEEKLY: "Todas las semanas",
  MONTHLY: "Todos los meses",
  YEARLY: "Todos los años",
  CUSTOM: "Personalizado...",
} as const;

export type PresetKey = keyof typeof PRESET_LABELS;

/** Iniciales para el selector D L M M J V S (índice = día de la semana). */
export const WEEKDAY_INITIALS = ["D", "L", "M", "M", "J", "V", "S"];

export const WEEKDAY_LABELS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

export const WEEKDAY_PLURALS = [
  "domingos",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábados",
];

export const MONTH_LABELS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export const NTH_WEEK_LABELS: Record<number, string> = {
  1: "primer",
  2: "segundo",
  3: "tercer",
  4: "cuarto",
  5: "último",
};

export type Recurrence = {
  freq: Freq;
  interval: number;
  timeOfDay: number | null;
  weekdays: number[];
  monthlyMode: MonthlyMode | null;
  monthDay: number | null;
  nthWeek: number | null;
  monthOfYear: number | null;
  endType: EndType;
  endDate: Date | null;
  endCount: number | null;
};

/** Igual que Recurrence pero tolerando `undefined` en los opcionales: es lo que devuelve Zod. */
export type RecurrenceInput = Omit<
  Recurrence,
  "timeOfDay" | "monthlyMode" | "monthDay" | "nthWeek" | "monthOfYear" | "endDate" | "endCount"
> & {
  timeOfDay?: number | null;
  monthlyMode?: MonthlyMode | null;
  monthDay?: number | null;
  nthWeek?: number | null;
  monthOfYear?: number | null;
  endDate?: Date | null;
  endCount?: number | null;
};

type TaskLike = Recurrence & { createdAt: Date; lastCompletedAt: Date | null };

// ------------------------------------------------------------------ fecha y hora

function clinicParts(instant: Date) {
  const shifted = new Date(instant.getTime() + CLINIC_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    minutesOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

/** Instante real a partir de una fecha/hora de la clínica. Date.UTC normaliza los desbordes. */
function clinicInstant(year: number, month: number, day: number, minutes: number) {
  return new Date(Date.UTC(year, month, day, 0, minutes) - CLINIC_OFFSET_MS);
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function weekdayOf(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day)).getUTCDay();
}

/** El día `nth` de semana `weekday` del mes; nth >= 5 significa el último. */
function nthWeekdayInstant(
  year: number,
  month: number,
  nth: number,
  weekday: number,
  minutes: number
) {
  if (nth >= 5) {
    const last = daysInMonth(year, month);
    for (let day = last; day >= 1; day--) {
      if (weekdayOf(year, month, day) === weekday) return clinicInstant(year, month, day, minutes);
    }
  }
  const offset = (weekday - weekdayOf(year, month, 1) + 7) % 7;
  return clinicInstant(year, month, 1 + offset + (nth - 1) * 7, minutes);
}

// -------------------------------------------------------------------- ocurrencias

/** Las ocurrencias de un ciclo. Solo la frecuencia semanal puede dar más de una. */
function cycleOccurrences(task: TaskLike, anchor: Date, minutes: number, cycle: number): Date[] {
  const { year, month, day, weekday } = clinicParts(anchor);
  const step = Math.max(1, task.interval);

  switch (task.freq) {
    case "HOUR":
      return [new Date(anchor.getTime() + cycle * step * HOUR_MS)];

    case "DAY":
      return [clinicInstant(year, month, day + cycle * step, minutes)];

    case "WEEK": {
      const days = task.weekdays.length ? [...task.weekdays].sort((a, b) => a - b) : [weekday];
      const weekStart = day - weekday;
      return days.map((wd) =>
        clinicInstant(year, month, weekStart + cycle * step * 7 + wd, minutes)
      );
    }

    case "MONTH": {
      const m = month + cycle * step;
      if (task.monthlyMode === "NTH_WEEKDAY") {
        return [nthWeekdayInstant(year, m, task.nthWeek ?? 1, task.weekdays[0] ?? weekday, minutes)];
      }
      const target = task.monthDay ?? day;
      return [clinicInstant(year, m, Math.min(target, daysInMonth(year, m)), minutes)];
    }

    case "YEAR": {
      const y = year + cycle * step;
      const m = task.monthOfYear ?? month;
      const target = task.monthDay ?? day;
      return [clinicInstant(y, m, Math.min(target, daysInMonth(y, m)), minutes)];
    }
  }
}

/** Salto inicial aproximado, para no recorrer ciclo por ciclo desde la creación. */
function estimateCycle(task: TaskLike, anchor: Date, after: Date): number {
  const step = Math.max(1, task.interval);
  const a = clinicParts(anchor);
  const b = clinicParts(after);
  const dayDiff = Math.floor(
    (Date.UTC(b.year, b.month, b.day) - Date.UTC(a.year, a.month, a.day)) / (24 * HOUR_MS)
  );

  let raw: number;
  switch (task.freq) {
    case "HOUR":
      raw = (after.getTime() - anchor.getTime()) / (step * HOUR_MS);
      break;
    case "DAY":
      raw = dayDiff / step;
      break;
    case "WEEK":
      raw = dayDiff / (step * 7);
      break;
    case "MONTH":
      raw = ((b.year - a.year) * 12 + (b.month - a.month)) / step;
      break;
    case "YEAR":
      raw = (b.year - a.year) / step;
      break;
  }

  // Un ciclo de colchón: la estimación puede quedar corta por el día del mes o la hora.
  return Math.max(0, Math.floor(raw) - 1);
}

/** Primera ocurrencia estrictamente posterior a `after`. */
function firstOccurrenceAfter(task: TaskLike, after: Date): Date {
  const anchor = task.createdAt;
  const minutes = task.timeOfDay ?? clinicParts(anchor).minutesOfDay;
  const start = estimateCycle(task, anchor, after);

  let last: Date | null = null;
  for (let cycle = start; cycle < start + MAX_CYCLES; cycle++) {
    for (const occurrence of cycleOccurrences(task, anchor, minutes, cycle)) {
      if (occurrence > after) return occurrence;
      last = occurrence;
    }
  }
  return last ?? after;
}

/**
 * Próximo vencimiento: la primera ocurrencia posterior a la última vez que se hizo.
 * Si nunca se hizo, la primera de la serie. Se calcula al vuelo y nunca se persiste,
 * así editar la repetición no deja fechas viejas dando vueltas.
 */
export function getNextDueAt(task: TaskLike): Date {
  if (task.lastCompletedAt) return firstOccurrenceAfter(task, task.lastCompletedAt);

  const minutes = task.timeOfDay ?? clinicParts(task.createdAt).minutesOfDay;
  const first = cycleOccurrences(task, task.createdAt, minutes, 0)[0];
  // La primera ocurrencia del ciclo 0 puede caer antes de la creación (por ejemplo el
  // lunes de la semana en que se creó la tarea): en ese caso vale la siguiente.
  if (first >= task.createdAt) return first;
  return firstOccurrenceAfter(task, task.createdAt);
}

/** ¿La repetición ya terminó? Depende del "finaliza" elegido. */
export function hasFinished(task: TaskLike, completionCount: number): boolean {
  if (task.endType === "AFTER_COUNT") {
    return task.endCount != null && completionCount >= task.endCount;
  }
  if (task.endType === "ON_DATE") {
    return task.endDate != null && getNextDueAt(task) > task.endDate;
  }
  return false;
}

/** Período nominal en horas: con cuánta anticipación avisar que vence. */
export function nominalPeriodHours(freq: Freq, interval: number): number {
  const step = Math.max(1, interval);
  switch (freq) {
    case "HOUR":
      return step;
    case "DAY":
      return step * 24;
    case "WEEK":
      return step * 168;
    case "MONTH":
      return step * 720;
    case "YEAR":
      return step * 8760;
  }
}

export function getMaintenanceStatus(task: TaskLike, completionCount = 0): MaintenanceStatusKey {
  if (hasFinished(task, completionCount)) return "FINISHED";

  const nextDueAt = getNextDueAt(task).getTime();
  const period = nominalPeriodHours(task.freq, task.interval) * HOUR_MS;
  const now = Date.now();
  if (now >= nextDueAt) return "OVERDUE";
  if (now >= nextDueAt - period * DUE_SOON_RATIO) return "DUE_SOON";
  return "OK";
}

// ------------------------------------------------------------------------ textos

export function formatTimeOfDay(minutes: number) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function joinWithY(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

function describeEnd(task: Recurrence) {
  if (task.endType === "ON_DATE" && task.endDate) {
    const p = clinicParts(task.endDate);
    const d = String(p.day).padStart(2, "0");
    const m = String(p.month + 1).padStart(2, "0");
    return ` · hasta el ${d}/${m}/${p.year}`;
  }
  if (task.endType === "AFTER_COUNT" && task.endCount) {
    return ` · ${task.endCount} ${task.endCount === 1 ? "vez" : "veces"}`;
  }
  return "";
}

export function describeRecurrence(task: Recurrence): string {
  const step = Math.max(1, task.interval);
  const at = task.timeOfDay != null ? ` a las ${formatTimeOfDay(task.timeOfDay)}` : "";
  const every = step === 1 ? null : `Cada ${step} ${FREQ_UNIT_LABELS[task.freq].many}`;

  switch (task.freq) {
    case "HOUR":
      return (step === 1 ? "Cada hora" : `Cada ${step} horas`) + describeEnd(task);

    case "DAY":
      return `${every ?? "Todos los días"}${at}${describeEnd(task)}`;

    case "WEEK": {
      const days = [...task.weekdays].sort((a, b) => a - b).map((d) => WEEKDAY_PLURALS[d]);
      const which = days.length ? ` los ${joinWithY(days)}` : "";
      return `${every ?? "Todas las semanas"}${which}${at}${describeEnd(task)}`;
    }

    case "MONTH": {
      const which =
        task.monthlyMode === "NTH_WEEKDAY"
          ? ` el ${NTH_WEEK_LABELS[task.nthWeek ?? 1] ?? "primer"} ${
              WEEKDAY_LABELS[task.weekdays[0] ?? 1]
            }`
          : ` el día ${task.monthDay ?? 1}`;
      return `${every ?? "Todos los meses"}${which}${at}${describeEnd(task)}`;
    }

    case "YEAR": {
      const which = ` el ${task.monthDay ?? 1} de ${MONTH_LABELS[task.monthOfYear ?? 0]}`;
      return `${every ?? "Todos los años"}${which}${at}${describeEnd(task)}`;
    }
  }
}

// -------------------------------------------------------------------------- filas

/**
 * Fila lista para la UI: el estado y el vencimiento se calculan una sola vez en el
 * servidor y bajan ya resueltos, así el cliente no recalcula contra un reloj distinto.
 */
export type MaintenanceAssetRef = { id: string; code: number; name: string };

export type MaintenanceRow = Recurrence & {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  lastCompletedAt: Date | null;
  nextDueAt: Date;
  status: MaintenanceStatusKey;
  completionCount: number;
  asset?: MaintenanceAssetRef | null;
};

export function toMaintenanceRow(
  task: Recurrence & {
    id: string;
    title: string;
    description: string | null;
    createdAt: Date;
    lastCompletedAt: Date | null;
    asset?: MaintenanceAssetRef | null;
  },
  completionCount: number
): MaintenanceRow {
  return {
    ...task,
    nextDueAt: getNextDueAt(task),
    status: getMaintenanceStatus(task, completionCount),
    completionCount,
  };
}
