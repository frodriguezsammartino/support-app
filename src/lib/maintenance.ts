export const DUE_SOON_RATIO = 0.2;
export const HOUR_MS = 3_600_000;
export const DAY_HOURS = 24;
export const WEEK_HOURS = 168;

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

type TaskLike = { lastCompletedAt: Date | null; createdAt: Date; intervalHours: number };

export function getNextDueAt(task: TaskLike): Date {
  const base = (task.lastCompletedAt ?? task.createdAt).getTime();
  return new Date(base + task.intervalHours * HOUR_MS);
}

export function getMaintenanceStatus(task: TaskLike): MaintenanceStatusKey {
  const nextDueAt = getNextDueAt(task).getTime();
  const dueSoonFrom = nextDueAt - task.intervalHours * HOUR_MS * DUE_SOON_RATIO;
  const now = Date.now();
  if (now >= nextDueAt) return "OVERDUE";
  if (now >= dueSoonFrom) return "DUE_SOON";
  return "OK";
}

export function describeInterval(hours: number): string {
  if (hours === DAY_HOURS) return "Diaria";
  if (hours === WEEK_HOURS) return "Semanal";
  if (hours % WEEK_HOURS === 0) return `Cada ${hours / WEEK_HOURS} semanas`;
  if (hours % DAY_HOURS === 0) return `Cada ${hours / DAY_HOURS} días`;
  return `Cada ${hours}hs`;
}

export type FrequencyUnit = "HOURS" | "DAYS" | "WEEKS";

export function unitToHours(value: number, unit: FrequencyUnit): number {
  const factor = unit === "HOURS" ? 1 : unit === "DAYS" ? DAY_HOURS : WEEK_HOURS;
  return Math.round(value * factor);
}

/**
 * Fila lista para la UI: el estado y el vencimiento se calculan una sola vez en el servidor
 * y bajan ya resueltos, así el cliente no recalcula contra un reloj distinto.
 */
export type MaintenanceRow = {
  id: string;
  title: string;
  description: string | null;
  intervalHours: number;
  active: boolean;
  createdAt: Date;
  lastCompletedAt: Date | null;
  nextDueAt: Date;
  status: MaintenanceStatusKey;
  completionCount: number;
};

export function toMaintenanceRow(
  task: {
    id: string;
    title: string;
    description: string | null;
    intervalHours: number;
    active: boolean;
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

/** Para precargar el formulario de edición: desglosa horas en la unidad más grande que divide exacto. */
export function hoursToUnit(hours: number): { value: number; unit: FrequencyUnit } {
  if (hours % WEEK_HOURS === 0) return { value: hours / WEEK_HOURS, unit: "WEEKS" };
  if (hours % DAY_HOURS === 0) return { value: hours / DAY_HOURS, unit: "DAYS" };
  return { value: hours, unit: "HOURS" };
}
