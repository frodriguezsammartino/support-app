import { PILL } from "./pills";

export type EscalationStatus = "WAITING" | "IN_PROGRESS" | "RESOLVED";

/**
 * El escalamiento a un proveedor es una etiqueta aparte del estado del ticket: un
 * ticket escalado sigue "en progreso", solo que se espera una respuesta de afuera.
 */
export const ESCALATION_META: Record<EscalationStatus, { label: string; short: string; badgeClass: string }> = {
  WAITING: { label: "Esperando respuesta", short: "esperando", badgeClass: PILL.warning },
  IN_PROGRESS: { label: "En gestión del proveedor", short: "en gestión", badgeClass: PILL.brand },
  RESOLVED: { label: "Resuelto por el proveedor", short: "resuelto", badgeClass: PILL.success },
};

export const ESCALATION_ORDER: EscalationStatus[] = ["WAITING", "IN_PROGRESS", "RESOLVED"];

/** Todavía hay algo pendiente del lado del proveedor. */
export function isOpenEscalation(status: EscalationStatus | null | undefined) {
  return status === "WAITING" || status === "IN_PROGRESS";
}
