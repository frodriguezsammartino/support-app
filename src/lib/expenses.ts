import { MONTH_NAMES, getPaymentsInWindow, type LicenseKind } from "./licenses";

/**
 * Resumen de gastos de sistemas por período, para el dashboard. Junta lo que se
 * paga de licencias y servicios (según su calendario de pagos) con las mejoras y
 * repuestos aprobados, y lo agrupa por categoría. Las monedas nunca se suman entre
 * sí: cada categoría lleva un monto por moneda.
 */
export type ExpenseCategory = "SOFTWARE" | "SERVICE" | "SUPPORT" | "OTHER" | "UPGRADES";

export const EXPENSE_CATEGORY_ORDER: ExpenseCategory[] = [
  "SOFTWARE",
  "SERVICE",
  "SUPPORT",
  "OTHER",
  "UPGRADES",
];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  SOFTWARE: "Licencias de software",
  SERVICE: "Servicios",
  SUPPORT: "Soporte contratado",
  OTHER: "Otros gastos fijos",
  UPGRADES: "Mejoras y repuestos",
};

const KIND_TO_CATEGORY: Record<LicenseKind, ExpenseCategory> = {
  SOFTWARE: "SOFTWARE",
  SERVICE: "SERVICE",
  SUPPORT: "SUPPORT",
  OTHER: "OTHER",
};

export type ExpenseMode = "mes" | "anio";

export type ExpensePeriod = {
  mode: ExpenseMode;
  /** "2026-10" para un mes, "2026" para un año. */
  key: string;
  label: string;
  from: Date;
  to: Date;
  prevKey: string;
  nextKey: string;
  /** El período que contiene a hoy. */
  isCurrent: boolean;
  currentKey: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
const monthKeyOf = (year: number, month: number) => `${year}-${pad(month + 1)}`;

/**
 * Lee el período pedido en la dirección. Si viene vacío o roto, cae en el actual:
 * una dirección mal escrita no tiene que romper el dashboard.
 */
export function resolvePeriod(
  mode: ExpenseMode,
  key: string | undefined,
  now: Date = new Date()
): ExpensePeriod {
  const thisYear = now.getUTCFullYear();
  const thisMonth = now.getUTCMonth();

  if (mode === "anio") {
    const parsed = key && /^\d{4}$/.test(key) ? Number(key) : NaN;
    const year = parsed >= 2000 && parsed <= 2100 ? parsed : thisYear;
    return {
      mode,
      key: String(year),
      label: String(year),
      from: new Date(Date.UTC(year, 0, 1, 0, 0, 0)),
      to: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
      prevKey: String(year - 1),
      nextKey: String(year + 1),
      isCurrent: year === thisYear,
      currentKey: String(thisYear),
    };
  }

  const match = key?.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  const year = match && Number(match[1]) >= 2000 && Number(match[1]) <= 2100 ? Number(match[1]) : thisYear;
  const month = match && year === Number(match[1]) ? Number(match[2]) - 1 : thisMonth;
  const prev = new Date(Date.UTC(year, month - 1, 1));
  const next = new Date(Date.UTC(year, month + 1, 1));
  return {
    mode,
    key: monthKeyOf(year, month),
    label: `${MONTH_NAMES[month]} ${year}`,
    from: new Date(Date.UTC(year, month, 1, 0, 0, 0)),
    to: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59)),
    prevKey: monthKeyOf(prev.getUTCFullYear(), prev.getUTCMonth()),
    nextKey: monthKeyOf(next.getUTCFullYear(), next.getUTCMonth()),
    isCurrent: year === thisYear && month === thisMonth,
    currentKey: monthKeyOf(thisYear, thisMonth),
  };
}

type PayableLicense = Parameters<typeof getPaymentsInWindow>[0];
export type ExpenseLicense = PayableLicense & { kind: LicenseKind };

export type ExpenseUpgrade = {
  id: string;
  title: string;
  targetLabel: string;
  costCents: number | null;
  currency: string;
  decidedAt: Date | null;
};

export type ExpenseItem = {
  id: string;
  name: string;
  category: ExpenseCategory;
  currency: string;
  cents: number;
  /** Cuántos pagos suma (un servicio mensual en un año son 12). */
  count: number;
};

export type ExpenseSummary = {
  items: ExpenseItem[];
  byCategory: Record<ExpenseCategory, Record<string, number>>;
  totals: Record<string, number>;
  currencies: string[];
};

function emptyByCategory() {
  return Object.fromEntries(EXPENSE_CATEGORY_ORDER.map((c) => [c, {}])) as Record<
    ExpenseCategory,
    Record<string, number>
  >;
}

/** Todo lo que se gasta entre `from` y `to`, por categoría y por moneda. */
export function summarizeExpenses(
  licenses: ExpenseLicense[],
  upgrades: ExpenseUpgrade[],
  from: Date,
  to: Date
): ExpenseSummary {
  const items: ExpenseItem[] = [];

  for (const license of licenses) {
    const payments = getPaymentsInWindow(license, from, to);
    if (payments.length === 0) continue;
    items.push({
      id: license.id,
      name: license.name,
      category: KIND_TO_CATEGORY[license.kind],
      currency: license.currency,
      cents: payments.reduce((sum, p) => sum + p.cents, 0),
      count: payments.length,
    });
  }

  for (const upgrade of upgrades) {
    if (!upgrade.costCents || !upgrade.decidedAt) continue;
    if (upgrade.decidedAt < from || upgrade.decidedAt > to) continue;
    items.push({
      id: upgrade.id,
      name: `${upgrade.title} · ${upgrade.targetLabel}`,
      category: "UPGRADES",
      currency: upgrade.currency,
      cents: upgrade.costCents,
      count: 1,
    });
  }

  const byCategory = emptyByCategory();
  const totals: Record<string, number> = {};
  for (const item of items) {
    byCategory[item.category][item.currency] = (byCategory[item.category][item.currency] ?? 0) + item.cents;
    totals[item.currency] = (totals[item.currency] ?? 0) + item.cents;
  }

  return { items, byCategory, totals, currencies: Object.keys(totals).sort() };
}

export const MONTH_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Los 12 meses de un año, para ver cómo se reparte el gasto a lo largo del año. */
export function monthlySeries(licenses: ExpenseLicense[], upgrades: ExpenseUpgrade[], year: number) {
  return MONTH_SHORT.map((label, month) => {
    const from = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    const to = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));
    return { label, byCategory: summarizeExpenses(licenses, upgrades, from, to).byCategory };
  });
}
