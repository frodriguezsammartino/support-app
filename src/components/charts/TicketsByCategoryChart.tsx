"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_PROPS, CHART, ChartCard, TOOLTIP_STYLE } from "./chart-shell";

export function TicketsByCategoryChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ChartCard
      title="Tickets por tipo de problema"
      subtitle="qué se rompe más seguido"
      isEmpty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        {/* Horizontal: los nombres de categoría no entran en el eje de abajo. */}
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid stroke={CHART.grid} horizontal={false} />
          <XAxis
            type="number"
            {...AXIS_PROPS}
            axisLine={{ stroke: CHART.axisLine }}
            allowDecimals={false}
          />
          <YAxis type="category" dataKey="name" {...AXIS_PROPS} axisLine={false} width={130} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: CHART.hover }} />
          <Bar
            dataKey="count"
            name="Tickets"
            fill={CHART.brand}
            radius={[0, 4, 4, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
