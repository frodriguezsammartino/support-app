import { PILL } from "./pills";
import { componentKindLabel } from "./components";

export type RequestKind = "RETIRE" | "UPGRADE" | "CHANGE" | "REPLACE" | "PURCHASE";
export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type RetireTarget = "ASSET" | "LICENSE" | "TASK";

/** Todo lo que no es una baja es un pedido que, si se aprueba, puede tener un costo. */
export type SpendKind = Exclude<RequestKind, "RETIRE">;

export const SPEND_KINDS: SpendKind[] = ["UPGRADE", "CHANGE", "REPLACE", "PURCHASE"];

export function isSpendKind(kind: string): kind is SpendKind {
  return (SPEND_KINDS as string[]).includes(kind);
}

export const KIND_META: Record<RequestKind, { label: string; badgeClass: string }> = {
  RETIRE: { label: "Baja", badgeClass: PILL.neutral },
  UPGRADE: { label: "Mejora", badgeClass: PILL.brand },
  CHANGE: { label: "Cambio", badgeClass: PILL.warning },
  REPLACE: { label: "Reemplazo", badgeClass: PILL.high },
  PURCHASE: { label: "Compra", badgeClass: PILL.success },
};

/** Cómo se elige el tipo al hacer un pedido: una frase corta que se entiende sin explicación. */
export const SPEND_KIND_OPTIONS: { value: SpendKind; label: string; hint: string; placeholder: string }[] = [
  {
    value: "UPGRADE",
    label: "Mejora",
    hint: "Algo que anda pero hay que potenciar.",
    placeholder: "Ej: Ampliar la RAM de 4 a 8 GB",
  },
  {
    value: "CHANGE",
    label: "Cambio por rotura",
    hint: "Se rompió o dejó de funcionar y hay que cambiarlo.",
    placeholder: "Ej: Cambiar el mouse, o el monitor que no prende",
  },
  {
    value: "REPLACE",
    label: "Reemplazo de equipo",
    hint: "No vale la pena arreglarlo: hay que cambiar el equipo.",
    placeholder: "Ej: Reemplazar la PC de Facturación 3",
  },
  {
    value: "PURCHASE",
    label: "Compra",
    hint: "Cosas del día a día que hay que comprar.",
    placeholder: "Ej: Comprar cables USB-C",
  },
];

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

/** Una línea de lo que hace falta: un componente mínimo o algo para comprar. */
export type RequestItem = { text: string; qty: number | null };

/** Las líneas guardadas, leídas con cuidado: viene de un campo JSON, así que no se asume su forma. */
export function parseItems(value: unknown): RequestItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { text, qty } = entry as { text?: unknown; qty?: unknown };
    if (typeof text !== "string" || !text.trim()) return [];
    return [{ text: text.trim(), qty: typeof qty === "number" && qty > 0 ? qty : null }];
  });
}

export function componentLabel(value: string | null | undefined) {
  return componentKindLabel(value);
}

/** Ventana del gasto de pedidos que se muestra y se suma: los últimos 12 meses. */
export const EXPENSE_WINDOW_MONTHS = 12;
