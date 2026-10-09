"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_PROPS, CHART, ChartCard, TOOLTIP_STYLE } from "./chart-shell";

export function MaintenanceTrendChart({ data }: { data: { week: string; count: number }[] }) {
  return (
    <ChartCard
      title="Mantenimientos realizados por semana"
      subtitle="constancia del trabajo preventivo"
      isEmpty={data.length === 0}
      emptyText="Todavía no hay mantenimientos registrados en este período."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 12, top: 4 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="week" {...AXIS_PROPS} axisLine={{ stroke: CHART.axisLine }} />
          <YAxis {...AXIS_PROPS} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: CHART.hover }} />
          <Bar
            dataKey="count"
            name="Mantenimientos"
            fill={CHART.good}
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
