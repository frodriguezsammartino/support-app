import { PILL } from "./pills";

export type RequestKind = "RETIRE" | "UPGRADE";
export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type RetireTarget = "ASSET" | "LICENSE" | "TASK";

export const KIND_META: Record<RequestKind, { label: string; badgeClass: string }> = {
  RETIRE: { label: "Baja", badgeClass: PILL.neutral },
  UPGRADE: { label: "Mejora", badgeClass: PILL.brand },
};

export const STATUS_META: Record<RequestStatus, { label: string; badgeClass: string }> = {
  PENDING: { label: "Pendiente", badgeClass: PILL.warning },
  APPROVED: { label: "Aprobada", badgeClass: PILL.success },
  REJECTED: { label: "Rechazada", badgeClass: PILL.danger },
};

export const TARGET_LABELS: Record<RetireTarget, string> = {
  ASSET: "el equipo",
  LICENSE: "la licencia o servicio",
  TASK: "la tarea periódica",
};

/** Qué pasa realmente cuando el admin aprueba una baja: no es lo mismo en los tres casos. */
export const RETIRE_CONSEQUENCE: Record<RetireTarget, string> = {
  ASSET:
    "Se elimina del inventario. Sus tickets y tareas de mantenimiento se conservan, pero dejan de estar vinculados a un equipo.",
  LICENSE:
    "Pasa a «Dada de baja»: deja de contar en los gastos pero el registro se conserva y se puede reactivar.",
  TASK: "Se elimina la tarea junto con todo su historial.",
};

export const UPGRADE_COMPONENTS = [
  { value: "RAM", label: "Memoria RAM" },
  { value: "DISCO", label: "Disco" },
  { value: "FUENTE", label: "Fuente" },
  { value: "COOLER", label: "Cooler" },
  { value: "OTRO", label: "Otro" },
] as const;

export type UpgradeComponent = (typeof UPGRADE_COMPONENTS)[number]["value"];

export function componentLabel(value: string | null | undefined) {
  return UPGRADE_COMPONENTS.find((c) => c.value === value)?.label ?? null;
}

/** Ventana del gasto de mejoras que se muestra y se suma: los últimos 12 meses. */
export const EXPENSE_WINDOW_MONTHS = 12;
