"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_PROPS, CHART, ChartCard, TOOLTIP_STYLE } from "./chart-shell";

export function ResolutionTimeChart({ data }: { data: { name: string; avgHours: number }[] }) {
  return (
    <ChartCard
      title="Cuánto tarda cada tipo de problema"
      subtitle="promedio en horas, del reporte al cierre"
      isEmpty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid stroke={CHART.grid} horizontal={false} />
          <XAxis type="number" {...AXIS_PROPS} axisLine={{ stroke: CHART.axisLine }} unit=" hs" />
          <YAxis type="category" dataKey="name" {...AXIS_PROPS} axisLine={false} width={130} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: CHART.hover }} />
          <Bar
            dataKey="avgHours"
            name="Promedio (hs)"
            fill={CHART.brand}
            radius={[0, 4, 4, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
