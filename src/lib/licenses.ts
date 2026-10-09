import { PILL, ROW_TINT, STATE_TEXT } from "./pills";

export type LicenseBilling = "MONTHLY" | "YEARLY" | "ONE_TIME";
export type LicenseStatus = "ACTIVE" | "CANCELLED";
export type LicenseKind = "SOFTWARE" | "SERVICE" | "SUPPORT" | "OTHER";

export const KIND_LABELS: Record<LicenseKind, string> = {
  SOFTWARE: "Licencia de software",
  SERVICE: "Servicio",
  SUPPORT: "Soporte contratado",
  OTHER: "Otro",
};

/** Versión corta, para la fila de la tabla. */
export const KIND_SHORT: Record<LicenseKind, string> = {
  SOFTWARE: "Licencia",
  SERVICE: "Servicio",
  SUPPORT: "Soporte",
  OTHER: "Otro",
};

export const KIND_HINTS: Record<LicenseKind, string> = {
  SOFTWARE: "Office, antivirus, el sistema de la clínica.",
  SERVICE: "Internet, telefonía, hosting, el dominio.",
  SUPPORT: "Mantenimiento o soporte contratado a un tercero.",
  OTHER: "Cualquier otro gasto fijo de sistemas.",
};

export const KIND_ORDER: LicenseKind[] = ["SOFTWARE", "SERVICE", "SUPPORT", "OTHER"];

export type LicensePricing = "PER_SEAT" | "FLAT" | "UNLIMITED";

export const PRICING_LABELS: Record<LicensePricing, string> = {
  PER_SEAT: "Por puesto",
  FLAT: "Paquete de puestos",
  UNLIMITED: "Sin límite de usuarios",
};

export const PRICING_HINTS: Record<LicensePricing, string> = {
  PER_SEAT: "Se paga por cada puesto contratado. Un puesto sin usar es plata tirada.",
  FLAT: "Precio cerrado por una cantidad de puestos. Usar menos no cambia lo que se paga.",
  UNLIMITED: "Se paga la suscripción y la usa quien haga falta. No hay puestos que contar.",
};

export const PRICING_ORDER: LicensePricing[] = ["PER_SEAT", "FLAT", "UNLIMITED"];

/** Con suscripción abierta no hay puestos: no se piden ni se muestran. */
export function hasSeats(pricing: LicensePricing) {
  return pricing !== "UNLIMITED";
}

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
  ACTIVE: { label: "Activa", badgeClass: PILL.success, rowClass: "" },
  CANCELLED: { label: "Dada de baja", badgeClass: PILL.neutral, rowClass: ROW_TINT.muted },
};

export const LICENSE_STATUS_ORDER: LicenseStatus[] = ["ACTIVE", "CANCELLED"];

export const CURRENCIES = ["ARS", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

type ExpiryState = "NONE" | "VALID" | "EXPIRING" | "EXPIRED";

/** Avisa 45 días antes: alcanza para renovar o buscar alternativa sin cortar el servicio. */
export const EXPIRY_WARN_DAYS = 45;

function getExpiryState(expiresAt: Date | null): ExpiryState {
  if (!expiresAt) return "NONE";
  const remainingDays = (expiresAt.getTime() - Date.now()) / 86_400_000;
  if (remainingDays < 0) return "EXPIRED";
  if (remainingDays <= EXPIRY_WARN_DAYS) return "EXPIRING";
  return "VALID";
}

type CostLike = {
  costCents: number | null;
  pricing: LicensePricing;
  seatsTotal: number;
  seatsAssigned: number;
};

/** Lo que se paga por período: con PER_SEAT hay que multiplicar por los puestos. */
export function totalCostCents(license: CostLike): number {
  if (!license.costCents) return 0;
  return license.pricing === "PER_SEAT"
    ? license.costCents * license.seatsTotal
    : license.costCents;
}

/**
 * Plata que se paga por puestos que nadie usa. Solo existe con PER_SEAT: en un
 * paquete de precio fijo los puestos de más no cuestan nada extra.
 */
export function wastedCostCents(license: CostLike): number {
  if (!license.costCents || license.pricing !== "PER_SEAT") return 0;
  const unused = Math.max(0, license.seatsTotal - license.seatsAssigned);
  return license.costCents * unused;
}

/** Lo que cuesta por año. Un pago único no es gasto recurrente, así que no suma. */
export function annualCostCents(license: CostLike & { billing: LicenseBilling }): number {
  const total = totalCostCents(license);
  if (!total) return 0;
  if (license.billing === "MONTHLY") return total * 12;
  if (license.billing === "YEARLY") return total;
  return 0;
}

/** Lo que se desperdicia por año, con la misma regla que el gasto anual. */
export function annualWastedCents(license: CostLike & { billing: LicenseBilling }): number {
  const wasted = wastedCostCents(license);
  if (!wasted) return 0;
  if (license.billing === "MONTHLY") return wasted * 12;
  if (license.billing === "YEARLY") return wasted;
  return 0;
}

/** Solo el número, sin la moneda: para cuando la moneda ya se muestra aparte. */
export function formatAmount(cents: number) {
  return (cents / 100).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatMoney(cents: number | null, currency: string) {
  if (cents == null) return "—";
  return `${currency} ${formatAmount(cents)}`;
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

// ------------------------------------------------------------------ vencimientos

export type LicenseAlert = "NONE" | "VALID" | "AUTO" | "EXPIRING" | "EXPIRED";

export const ALERT_META: Record<LicenseAlert, { label: string; className: string }> = {
  NONE: { label: "Sin vencimiento", className: "text-ink-muted/70" },
  VALID: { label: "Vigente", className: "text-ink-muted" },
  AUTO: { label: "Se renueva sola", className: "text-ink-muted" },
  EXPIRING: { label: "Por vencer", className: STATE_TEXT.warning },
  EXPIRED: { label: "Vencida", className: STATE_TEXT.danger },
};

type LicenseLike = {
  expiresAt: Date | null;
  autoRenew: boolean;
  status: LicenseStatus;
  billing: LicenseBilling;
};

/**
 * Lo que hay que mirar. Una licencia con renovación automática nunca "vence":
 * se cobra sola, así que no entra en vencidas ni en por vencer.
 */
export function getLicenseAlert(license: LicenseLike): LicenseAlert {
  if (license.status === "CANCELLED" || !license.expiresAt) return "NONE";
  if (license.autoRenew) return "AUTO";
  return getExpiryState(license.expiresAt);
}

// ------------------------------------------------------------------ calendario de pagos

/** Suma meses conservando el día; si el mes destino es más corto, usa el último día. */
function addMonthsUTC(date: Date, months: number) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month + months, Math.min(day, lastDay), 12));
}

function startOfMonthUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12));
}

export function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const MONTH_NAMES = [
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

export function monthLabel(date: Date) {
  return `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

type PayableLicense = LicenseLike &
  CostLike & {
    id: string;
    name: string;
    currency: string;
  };

export type ScheduledPayment = {
  licenseId: string;
  licenseName: string;
  date: Date;
  cents: number;
  currency: string;
};

/**
 * Las fechas en que se va a pagar esta licencia dentro de la ventana pedida.
 * `expiresAt` es el ancla: de ahí se proyecta hacia adelante según la periodicidad.
 * Un pago único solo aparece si todavía no ocurrió.
 */
export function getPaymentsInWindow(
  license: PayableLicense,
  from: Date,
  to: Date
): ScheduledPayment[] {
  if (license.status === "CANCELLED") return [];
  const cents = totalCostCents(license);
  if (!license.expiresAt || !cents) return [];

  const base = {
    licenseId: license.id,
    licenseName: license.name,
    cents,
    currency: license.currency,
  };

  if (license.billing === "ONE_TIME") {
    const date = license.expiresAt;
    return date >= from && date <= to ? [{ ...base, date }] : [];
  }

  const step = license.billing === "MONTHLY" ? 1 : 12;
  const payments: ScheduledPayment[] = [];

  // Retrocede hasta antes de la ventana y después avanza: así funciona igual si la
  // fecha de referencia quedó en el pasado (renovación automática) o en el futuro.
  let cursor = license.expiresAt;
  for (let i = 0; i < 600 && cursor > from; i++) cursor = addMonthsUTC(cursor, -step);
  for (let i = 0; i < 600 && cursor < from; i++) cursor = addMonthsUTC(cursor, step);

  // El tope evita cualquier chance de bucle infinito si entrara una fecha rara.
  for (let i = 0; i < 200 && cursor <= to; i++) {
    payments.push({ ...base, date: cursor });
    cursor = addMonthsUTC(cursor, step);
  }

  return payments;
}

export type MonthBucket = {
  key: string;
  label: string;
  date: Date;
  payments: ScheduledPayment[];
  totals: Record<string, number>;
};

/** Los próximos N meses con lo que se paga en cada uno, empezando por el mes actual. */
export function getPaymentCalendar(licenses: PayableLicense[], months = 12): MonthBucket[] {
  const firstMonth = startOfMonthUTC(new Date());
  const lastMonth = addMonthsUTC(firstMonth, months - 1);
  const to = new Date(Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth() + 1, 0, 23, 59));

  const buckets: MonthBucket[] = [];
  for (let i = 0; i < months; i++) {
    const date = addMonthsUTC(firstMonth, i);
    buckets.push({ key: monthKey(date), label: monthLabel(date), date, payments: [], totals: {} });
  }

  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const license of licenses) {
    for (const payment of getPaymentsInWindow(license, firstMonth, to)) {
      const bucket = byKey.get(monthKey(payment.date));
      if (!bucket) continue;
      bucket.payments.push(payment);
      bucket.totals[payment.currency] = (bucket.totals[payment.currency] ?? 0) + payment.cents;
    }
  }

  for (const bucket of buckets) {
    bucket.payments.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  return buckets;
}
