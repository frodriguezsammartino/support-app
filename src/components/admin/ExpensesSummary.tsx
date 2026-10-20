import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatAmount } from "@/lib/licenses";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_ORDER,
  MONTH_SHORT,
  type ExpenseCategory,
  type ExpensePeriod,
  type ExpenseSummary,
} from "@/lib/expenses";
import { ExpensesByMonthChart, type ExpensesMonthRow } from "@/components/charts/ExpensesByMonthChart";
import { MoneyCard, type MoneyRow } from "@/components/charts/MoneyCard";
import { PaymentCalendarDialog } from "@/components/licenses/PaymentCalendarDialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type MonthlySeries = { label: string; byCategory: ExpenseSummary["byCategory"] }[];

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function Segment({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      scroll={false}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-white text-brand shadow-sm" : "text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

function StepLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-label={label}
      title={label}
      className="inline-flex size-8 items-center justify-center rounded-lg border border-line bg-white text-ink-muted transition-colors hover:bg-brand-tint hover:text-brand"
    >
      {children}
    </Link>
  );
}

/**
 * Cuánta plata se va en sistemas, por mes o por año, agrupada por categoría. Lo
 * que se paga de licencias y servicios sale de su calendario de pagos; las
 * mejoras cuentan en el mes en que se aprobaron.
 */
export function ExpensesSummary({
  period,
  summary,
  series,
  wastedRows,
  hrefs,
  calendar,
}: {
  period: ExpensePeriod;
  summary: ExpenseSummary;
  /** Solo en la vista anual: los 12 meses, para el gráfico. */
  series?: MonthlySeries;
  wastedRows: MoneyRow[];
  hrefs: { mes: string; anio: string; prev: string; next: string; today: string };
  /** El calendario de los próximos 12 meses, que se abre con un botón. */
  calendar: React.ReactNode;
}) {
  const isMonth = period.mode === "mes";
  const currencies = summary.currencies;
  const totalRows: MoneyRow[] = currencies.map((currency) => ({
    currency,
    cents: summary.totals[currency] ?? 0,
  }));

  const categories = EXPENSE_CATEGORY_ORDER.filter((category) =>
    currencies.some((currency) => (summary.byCategory[category][currency] ?? 0) > 0)
  );
  const itemsOf = (category: ExpenseCategory) =>
    summary.items.filter((item) => item.category === category).sort((a, b) => b.cents - a.cents);

  const chartData: Record<string, ExpensesMonthRow[]> = {};
  if (series) {
    // El gráfico tiene una moneda por vez; se muestran solo las que tienen gasto en el año.
    for (const currency of currencies) {
      chartData[currency] = series.map((month, index) => {
        const row = { month: MONTH_SHORT[index] } as ExpensesMonthRow;
        for (const category of EXPENSE_CATEGORY_ORDER) {
          row[category] = (month.byCategory[category][currency] ?? 0) / 100;
        }
        return row;
      });
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Resumen de gastos
          </h2>
          <p className="text-xs text-slate-400">
            licencias, servicios, soporte y mejoras aprobadas
          </p>
        </div>
        <PaymentCalendarDialog>{calendar}</PaymentCalendarDialog>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Período" className="flex gap-1 rounded-lg bg-slate-100 p-1">
          <Segment href={hrefs.mes} active={isMonth}>
            Mensual
          </Segment>
          <Segment href={hrefs.anio} active={!isMonth}>
            Anual
          </Segment>
        </div>

        <div className="flex items-center gap-2">
          <StepLink href={hrefs.prev} label={isMonth ? "Mes anterior" : "Año anterior"}>
            <ChevronLeft className="size-4" />
          </StepLink>
          <span className="min-w-36 text-center text-sm font-semibold text-ink">
            {capitalize(period.label)}
          </span>
          <StepLink href={hrefs.next} label={isMonth ? "Mes siguiente" : "Año siguiente"}>
            <ChevronRight className="size-4" />
          </StepLink>
        </div>

        {!period.isCurrent && (
          <Link
            href={hrefs.today}
            scroll={false}
            className="text-sm font-medium text-brand hover:underline"
          >
            {isMonth ? "Volver a este mes" : "Volver a este año"}
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MoneyCard
          title={isMonth ? "Total del mes" : "Total del año"}
          subtitle={capitalize(period.label)}
          rows={totalRows}
        />
        <MoneyCard
          title="Se paga sin usar"
          subtitle="por año, solo licencias por puesto"
          rows={wastedRows}
          alert
        />
      </div>

      <Card className="py-0">
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-muted">
              No hay gastos en este período. Para que aparezcan, cargá el costo y la fecha de
              vencimiento o renovación en Licencias y Servicios.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  {currencies.map((currency) => (
                    <TableHead key={currency} className="w-44 text-right">
                      {currency}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <CategoryRows
                    key={category}
                    label={EXPENSE_CATEGORY_LABELS[category]}
                    totals={summary.byCategory[category]}
                    items={itemsOf(category)}
                    currencies={currencies}
                  />
                ))}

                <TableRow className="bg-slate-50">
                  <TableCell className="font-semibold text-ink">Total</TableCell>
                  {currencies.map((currency) => (
                    <TableCell
                      key={currency}
                      className="text-right font-semibold tabular-nums text-ink"
                    >
                      {formatAmount(summary.totals[currency] ?? 0)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {series && currencies.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {currencies.map((currency) => (
            <ExpensesByMonthChart key={currency} data={chartData[currency]} currency={currency} />
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400">
        Se calcula con los contratos cargados (costo y fecha de vencimiento o renovación) y las
        mejoras aprobadas. No guarda pagos pasados: los meses anteriores muestran lo que cuestan
        hoy los contratos.
      </p>
    </section>
  );
}

/** Una categoría: su total arriba y debajo cada licencia, servicio o mejora que la compone. */
function CategoryRows({
  label,
  totals,
  items,
  currencies,
}: {
  label: string;
  totals: Record<string, number>;
  items: ExpenseSummary["items"];
  currencies: string[];
}) {
  return (
    <>
      <TableRow className="bg-slate-50/70">
        <TableCell className="font-medium text-ink">{label}</TableCell>
        {currencies.map((currency) => (
          <TableCell key={currency} className="text-right font-medium tabular-nums text-ink">
            {(totals[currency] ?? 0) > 0 ? (
              formatAmount(totals[currency])
            ) : (
              <span className="text-slate-300">—</span>
            )}
          </TableCell>
        ))}
      </TableRow>
      {items.map((item) => (
        <TableRow key={item.id}>
          <TableCell className="pl-8 text-ink-muted">
            {item.name}
            {item.count > 1 && (
              <span className="ml-2 text-xs text-slate-400">{item.count} pagos</span>
            )}
          </TableCell>
          {currencies.map((currency) => (
            <TableCell key={currency} className="text-right tabular-nums text-ink-muted">
              {item.currency === currency ? (
                formatAmount(item.cents)
              ) : (
                <span className="text-slate-300">—</span>
              )}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
