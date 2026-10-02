export const DUE_SOON_RATIO = 0.2;
export const HOUR_MS = 3_600_000;
export const DAY_HOURS = 24;
export const WEEK_HOURS = 168;
export const MONTH_HOURS = 720;

/**
 * La clínica está en Argentina, que no tiene horario de verano: el offset es
 * -03:00 todo el año. Con un offset fijo la aritmética de "las 8 de la mañana"
 * es exacta sin arrastrar una librería de zonas horarias.
 */
const CLINIC_OFFSET_MS = -3 * HOUR_MS;

export type MaintenanceStatusKey = "OK" | "DUE_SOON" | "OVERDUE";

export const MAINTENANCE_STATUS_META: Record<
  MaintenanceStatusKey,
  { label: string; badgeClass: string; dot: string; rowClass: string; textClass: string }
> = {
  OK: {
    label: "Al día",
    badgeClass: "bg-[#0ca30c] text-white border-transparent",
    dot: "bg-[#0ca30c]",
    rowClass: "",
    textClass: "text-zinc-600",
  },
  DUE_SOON: {
    label: "Vence pronto",
    badgeClass: "bg-[#fab219] text-black border-transparent",
    dot: "bg-[#fab219]",
    rowClass: "bg-amber-50/70 hover:bg-amber-50",
    textClass: "text-amber-700 font-medium",
  },
  OVERDUE: {
    label: "Vencida",
    badgeClass: "bg-[#d03b3b] text-white border-transparent",
    dot: "bg-[#d03b3b]",
    rowClass: "bg-red-50/70 hover:bg-red-50",
    textClass: "text-red-700 font-medium",
  },
};

export type ScheduleType =
  | "INTERVAL"
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY_DAY"
  | "MONTHLY_NTH_WEEKDAY";

export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  DAILY: "Todos los días",
  WEEKLY: "Un día fijo de la semana",
  MONTHLY_DAY: "Un día fijo del mes",
  MONTHLY_NTH_WEEKDAY: "Un día de semana del mes",
  INTERVAL: "Cada X horas / días",
};

export const WEEKDAY_LABELS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

/** Solo sábado y domingo cambian en plural; el resto son invariantes. */
export const WEEKDAY_PLURALS = [
  "domingos",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábados",
];

export const NTH_WEEK_LABELS: Record<number, string> = {
  1: "primer",
  2: "segundo",
  3: "tercer",
  4: "cuarto",
  5: "último",
};

export type Schedule = {
  scheduleType: ScheduleType;
  intervalHours: number;
  timeOfDay: number | null;
  weekday: number | null;
  monthDay: number | null;
  nthWeek: number | null;
};

type TaskLike = Schedule & { lastCompletedAt: Date | null; createdAt: Date };

/** Campos de fecha leídos en hora de la clínica. */
function clinicParts(instant: Date) {
  const shifted = new Date(instant.getTime() + CLINIC_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
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

/** El día `nth` de semana `weekday` del mes; nth = 5 significa el último. */
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

/**
 * Próximo vencimiento: la primera ocurrencia de la agenda posterior a la última vez
 * que se hizo (o a la creación, si nunca se hizo). Se calcula al vuelo y nunca se
 * persiste, así editar la frecuencia no deja fechas viejas dando vueltas.
 */
export function getNextDueAt(task: TaskLike): Date {
  const base = task.lastCompletedAt ?? task.createdAt;
  const minutes = task.timeOfDay ?? 0;
  const { year, month, day } = clinicParts(base);

  switch (task.scheduleType) {
    case "DAILY": {
      const today = clinicInstant(year, month, day, minutes);
      return today > base ? today : clinicInstant(year, month, day + 1, minutes);
    }

    case "WEEKLY": {
      const target = task.weekday ?? 1;
      for (let i = 0; i <= 7; i++) {
        const candidate = clinicInstant(year, month, day + i, minutes);
        if (candidate > base && clinicParts(candidate).weekday === target) return candidate;
      }
      break;
    }

    case "MONTHLY_DAY": {
      const target = task.monthDay ?? 1;
      for (let i = 0; i <= 2; i++) {
        const candidate = clinicInstant(
          year,
          month + i,
          Math.min(target, daysInMonth(year, month + i)),
          minutes
        );
        if (candidate > base) return candidate;
      }
      break;
    }

    case "MONTHLY_NTH_WEEKDAY": {
      for (let i = 0; i <= 2; i++) {
        const candidate = nthWeekdayInstant(
          year,
          month + i,
          task.nthWeek ?? 1,
          task.weekday ?? 1,
          minutes
        );
        if (candidate > base) return candidate;
      }
      break;
    }
  }

  return new Date(base.getTime() + task.intervalHours * HOUR_MS);
}

export function getMaintenanceStatus(task: TaskLike): MaintenanceStatusKey {
  const nextDueAt = getNextDueAt(task).getTime();
  const dueSoonFrom = nextDueAt - task.intervalHours * HOUR_MS * DUE_SOON_RATIO;
  const now = Date.now();
  if (now >= nextDueAt) return "OVERDUE";
  if (now >= dueSoonFrom) return "DUE_SOON";
  return "OK";
}

function formatTime(minutes: number) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

export function describeInterval(hours: number): string {
  if (hours === DAY_HOURS) return "Cada 24hs";
  if (hours === WEEK_HOURS) return "Cada 7 días";
  if (hours % WEEK_HOURS === 0) return `Cada ${hours / WEEK_HOURS} semanas`;
  if (hours % DAY_HOURS === 0) return `Cada ${hours / DAY_HOURS} días`;
  return `Cada ${hours}hs`;
}

export function describeSchedule(schedule: Schedule): string {
  const at = schedule.timeOfDay != null ? ` a las ${formatTime(schedule.timeOfDay)}` : "";

  switch (schedule.scheduleType) {
    case "DAILY":
      return `Todos los días${at}`;
    case "WEEKLY":
      return `Todos los ${WEEKDAY_PLURALS[schedule.weekday ?? 1]}${at}`;
    case "MONTHLY_DAY":
      return `El ${schedule.monthDay ?? 1} de cada mes${at}`;
    case "MONTHLY_NTH_WEEKDAY": {
      const nth = NTH_WEEK_LABELS[schedule.nthWeek ?? 1] ?? "primer";
      return `El ${nth} ${WEEKDAY_LABELS[schedule.weekday ?? 1]} de cada mes${at}`;
    }
    default:
      return describeInterval(schedule.intervalHours);
  }
}

/** Período nominal que usa el umbral de "vence pronto". */
export function nominalIntervalHours(scheduleType: ScheduleType, intervalHours: number): number {
  switch (scheduleType) {
    case "DAILY":
      return DAY_HOURS;
    case "WEEKLY":
      return WEEK_HOURS;
    case "MONTHLY_DAY":
    case "MONTHLY_NTH_WEEKDAY":
      return MONTH_HOURS;
    default:
      return intervalHours;
  }
}

export type FrequencyUnit = "HOURS" | "DAYS" | "WEEKS";

export function unitToHours(value: number, unit: FrequencyUnit): number {
  const factor = unit === "HOURS" ? 1 : unit === "DAYS" ? DAY_HOURS : WEEK_HOURS;
  return Math.round(value * factor);
}

/** Para precargar el formulario de edición: desglosa horas en la unidad más grande que divide exacto. */
export function hoursToUnit(hours: number): { value: number; unit: FrequencyUnit } {
  if (hours % WEEK_HOURS === 0) return { value: hours / WEEK_HOURS, unit: "WEEKS" };
  if (hours % DAY_HOURS === 0) return { value: hours / DAY_HOURS, unit: "DAYS" };
  return { value: hours, unit: "HOURS" };
}

/**
 * Fila lista para la UI: el estado y el vencimiento se calculan una sola vez en el servidor
 * y bajan ya resueltos, así el cliente no recalcula contra un reloj distinto.
 */
export type MaintenanceRow = Schedule & {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  lastCompletedAt: Date | null;
  nextDueAt: Date;
  status: MaintenanceStatusKey;
  completionCount: number;
};

export function toMaintenanceRow(
  task: Schedule & {
    id: string;
    title: string;
    description: string | null;
    createdAt: Date;
    lastCompletedAt: Date | null;
  },
  completionCount: number
): MaintenanceRow {
  return {
    ...task,
    nextDueAt: getNextDueAt(task),
    status: getMaintenanceStatus(task),
    completionCount,
  };
}
