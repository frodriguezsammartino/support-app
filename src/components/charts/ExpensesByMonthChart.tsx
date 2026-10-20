"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_ORDER,
  type ExpenseCategory,
} from "@/lib/expenses";
import { AXIS_PROPS, CHART, CATEGORICAL, ChartCard, TOOLTIP_STYLE } from "./chart-shell";

/** Un color fijo por categoría, siempre el mismo en todos los gráficos. */
const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  SOFTWARE: CATEGORICAL[0],
  SERVICE: CATEGORICAL[1],
  SUPPORT: CATEGORICAL[2],
  OTHER: CATEGORICAL[3],
  UPGRADES: CATEGORICAL[5],
};

export type ExpensesMonthRow = { month: string } & Record<ExpenseCategory, number>;

const money = (value: number) =>
  value.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Cómo se reparte el gasto del año mes a mes, apilado por categoría y en una sola moneda. */
export function ExpensesByMonthChart({
  data,
  currency,
}: {
  data: ExpensesMonthRow[];
  currency: string;
}) {
  const isEmpty = data.every((row) => EXPENSE_CATEGORY_ORDER.every((c) => row[c] === 0));

  return (
    <ChartCard
      title={`Gasto por mes (${currency})`}
      subtitle="apilado por categoría"
      isEmpty={isEmpty}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 12, top: 4 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="month" {...AXIS_PROPS} axisLine={{ stroke: CHART.axisLine }} />
          <YAxis
            {...AXIS_PROPS}
            axisLine={false}
            width={56}
            tickFormatter={(v: number) =>
              v >= 1_000_000 ? `${Math.round(v / 100_000) / 10} M` : v >= 1000 ? `${Math.round(v / 1000)} mil` : String(v)
            }
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: CHART.hover }}
            formatter={(value, name) => [`${currency} ${money(Number(value))}`, String(name)]}
          />
          <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
          {EXPENSE_CATEGORY_ORDER.map((category) => (
            <Bar
              key={category}
              dataKey={category}
              name={EXPENSE_CATEGORY_LABELS[category]}
              stackId="gasto"
              fill={CATEGORY_COLORS[category]}
              stroke="#FFFFFF"
              strokeWidth={1}
              maxBarSize={44}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
