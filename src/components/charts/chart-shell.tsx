import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Un solo lugar define cómo se ven los ejes y la grilla de todos los gráficos. */
export const CHART = {
  brand: "#075573",
  brandSoft: "#5E96AB",
  good: "#16A34A",
  warn: "#F59E0B",
  high: "#EA580C",
  bad: "#DC2626",
  grid: "#E2E8F0",
  axis: "#5E7A8A",
  axisLine: "#94A3B8",
  hover: "#F1F5F9",
} as const;

export const AXIS_PROPS = {
  stroke: CHART.axis,
  fontSize: 12,
  tickLine: false,
} as const;

export const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 10,
  border: `1px solid ${CHART.grid}`,
  boxShadow: "none",
} as const;

/** Paleta categórica: azul institucional y sus derivados, en orden fijo. */
export const CATEGORICAL = ["#075573", "#5E96AB", "#0A2E3D", "#94A3B8", "#166534", "#92400E"];

export function ChartCard({
  title,
  subtitle,
  isEmpty,
  emptyText = "Todavía no hay datos para este período.",
  children,
}: {
  title: string;
  subtitle?: string;
  isEmpty?: boolean;
  emptyText?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-ink">{title}</CardTitle>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </CardHeader>
      <CardContent className="h-64">
        {isEmpty ? (
          <p className="flex h-full items-center justify-center px-6 text-center text-sm text-ink-muted">
            {emptyText}
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
