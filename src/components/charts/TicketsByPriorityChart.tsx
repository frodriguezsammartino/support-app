"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_PROPS, CHART, ChartCard, TOOLTIP_STYLE } from "./chart-shell";

// Mismo semáforo que usan los pills y los puntos de la tabla.
const COLORS: Record<string, string> = {
  Baja: CHART.good,
  Media: CHART.warn,
  Alta: CHART.high,
  Urgente: CHART.bad,
  "Sin clasificar": CHART.axisLine,
};

export function TicketsByPriorityChart({ data }: { data: { priority: string; count: number }[] }) {
  return (
    <ChartCard
      title="Tickets por urgencia"
      subtitle="cómo se reparte la carga"
      isEmpty={data.every((d) => d.count === 0)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 12, top: 4 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="priority" {...AXIS_PROPS} axisLine={{ stroke: CHART.axisLine }} />
          <YAxis {...AXIS_PROPS} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: CHART.hover }} />
          <Bar dataKey="count" name="Tickets" radius={[4, 4, 0, 0]} maxBarSize={56}>
            {data.map((d) => (
              <Cell key={d.priority} fill={COLORS[d.priority] ?? CHART.brand} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
