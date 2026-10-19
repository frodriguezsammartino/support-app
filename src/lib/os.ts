import { PILL } from "./pills";

/**
 * Sistemas operativos y ofimática conocidos, con la fecha en que el fabricante
 * dejó de dar actualizaciones de seguridad (`null` = todavía tiene soporte).
 *
 * El equipo guarda solo el nombre; acá se decide si ese nombre tiene soporte. En
 * una clínica, una PC sin parches de seguridad con datos de pacientes es un
 * riesgo real, así que el panel lo marca. Las fechas son las del soporte
 * estándar: Microsoft vende soporte extendido pago (ESU) para algunas versiones.
 */
export type SoftwareEntry = { label: string; supportEndsAt: Date | null };

const day = (iso: string) => new Date(`${iso}T12:00:00Z`);

export const OS_CATALOG: SoftwareEntry[] = [
  { label: "Windows 11 Pro", supportEndsAt: null },
  { label: "Windows 10 Pro", supportEndsAt: day("2025-10-14") },
  { label: "Windows 8.1", supportEndsAt: day("2023-01-10") },
  { label: "Windows 7 Pro", supportEndsAt: day("2020-01-14") },
  { label: "Windows Server 2022", supportEndsAt: null },
  { label: "Windows Server 2019", supportEndsAt: null },
  { label: "Windows Server 2016", supportEndsAt: day("2027-01-12") },
  { label: "Windows Server 2012 R2", supportEndsAt: day("2023-10-10") },
  { label: "Linux", supportEndsAt: null },
  { label: "macOS", supportEndsAt: null },
];

export const OFFICE_CATALOG: SoftwareEntry[] = [
  { label: "OpenOffice", supportEndsAt: null },
  { label: "LibreOffice", supportEndsAt: null },
  { label: "Microsoft 365", supportEndsAt: null },
  { label: "Office 2021", supportEndsAt: day("2026-10-13") },
  { label: "Office 2019", supportEndsAt: day("2025-10-14") },
  { label: "Office 2016", supportEndsAt: day("2025-10-14") },
  { label: "Office 2013", supportEndsAt: day("2023-04-11") },
  { label: "Office 2010", supportEndsAt: day("2020-10-13") },
  { label: "Office 2010 Starter", supportEndsAt: day("2020-10-13") },
];

/** Solo los equipos con sistema instalado: una impresora o un UPS no. */
export function hasSoftware(type: string) {
  return type === "PC" || type === "NOTEBOOK" || type === "SERVER";
}

export type SupportState = "SUPPORTED" | "ENDED" | "UNKNOWN";

export function getSupportState(
  label: string | null | undefined,
  catalog: SoftwareEntry[],
  now: Date = new Date()
): SupportState {
  if (!label) return "UNKNOWN";
  const entry = catalog.find((e) => e.label === label);
  if (!entry) return "UNKNOWN";
  if (!entry.supportEndsAt) return "SUPPORTED";
  return entry.supportEndsAt.getTime() <= now.getTime() ? "ENDED" : "SUPPORTED";
}

export function supportEndDate(label: string, catalog: SoftwareEntry[]): Date | null {
  return catalog.find((e) => e.label === label)?.supportEndsAt ?? null;
}

export const SUPPORT_META: Record<SupportState, { label: string; badgeClass: string; textClass: string }> = {
  SUPPORTED: { label: "Con soporte", badgeClass: PILL.success, textClass: "text-ink-muted" },
  ENDED: { label: "Sin soporte", badgeClass: PILL.danger, textClass: "font-medium text-[#991B1B]" },
  UNKNOWN: { label: "Sin clasificar", badgeClass: PILL.neutral, textClass: "text-ink-muted" },
};
