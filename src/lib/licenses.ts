export type LicenseBilling = "MONTHLY" | "YEARLY" | "ONE_TIME";
export type LicenseStatus = "ACTIVE" | "CANCELLED";

export const BILLING_LABELS: Record<LicenseBilling, string> = {
  MONTHLY: "Por mes",
  YEARLY: "Por año",
  ONE_TIME: "Pago único",
};

export const BILLING_ORDER: LicenseBilling[] = ["YEARLY", "MONTHLY", "ONE_TIME"];

export const LICENSE_STATUS_META: Record<
  LicenseStatus,
  { label: string; badgeClass: string; rowClass: string }
> = {
  ACTIVE: {
    label: "Activa",
    badgeClass: "bg-[#0ca30c] text-white border-transparent",
    rowClass: "",
  },
  CANCELLED: {
    label: "Dada de baja",
    badgeClass: "bg-zinc-500 text-white border-transparent",
    rowClass: "opacity-60",
  },
};

export const LICENSE_STATUS_ORDER: LicenseStatus[] = ["ACTIVE", "CANCELLED"];

export const CURRENCIES = ["ARS", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export type ExpiryState = "NONE" | "VALID" | "EXPIRING" | "EXPIRED";

/** Avisa 45 días antes: alcanza para renovar o buscar alternativa sin cortar el servicio. */
export const EXPIRY_WARN_DAYS = 45;

export const EXPIRY_META: Record<ExpiryState, { label: string; className: string }> = {
  NONE: { label: "Sin vencimiento", className: "text-zinc-400" },
  VALID: { label: "Vigente", className: "text-zinc-600" },
  EXPIRING: { label: "Por vencer", className: "text-amber-700 font-medium" },
  EXPIRED: { label: "Vencida", className: "text-red-700 font-medium" },
};

export function getExpiryState(expiresAt: Date | null): ExpiryState {
  if (!expiresAt) return "NONE";
  const remainingDays = (expiresAt.getTime() - Date.now()) / 86_400_000;
  if (remainingDays < 0) return "EXPIRED";
  if (remainingDays <= EXPIRY_WARN_DAYS) return "EXPIRING";
  return "VALID";
}

/** Puestos libres. Nunca negativo: si hay más asignados que comprados, el faltante va aparte. */
export function availableSeats(license: { seatsTotal: number; seatsAssigned: number }) {
  return Math.max(0, license.seatsTotal - license.seatsAssigned);
}

/** Se están usando más puestos de los que se pagan. */
export function isOverAssigned(license: { seatsTotal: number; seatsAssigned: number }) {
  return license.seatsAssigned > license.seatsTotal;
}

/** Lo que cuesta por año. Un pago único no es gasto recurrente, así que no suma. */
export function annualCostCents(license: {
  costCents: number | null;
  billing: LicenseBilling;
}): number {
  if (!license.costCents) return 0;
  if (license.billing === "MONTHLY") return license.costCents * 12;
  if (license.billing === "YEARLY") return license.costCents;
  return 0;
}

export function formatMoney(cents: number | null, currency: string) {
  if (cents == null) return "—";
  const amount = cents / 100;
  return `${currency} ${amount.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "1250.5" -> 125050 centavos. Acepta coma o punto como separador decimal. */
export function parseMoneyToCents(value: string): number | null {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  if (!normalized) return null;
  const amount = Number(normalized);
  if (Number.isNaN(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

/** Centavos -> el texto que va en el input del formulario. */
export function centsToInput(cents: number | null) {
  return cents == null ? "" : String(cents / 100);
}
