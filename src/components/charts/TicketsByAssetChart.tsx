"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_PROPS, CHART, ChartCard, TOOLTIP_STYLE } from "./chart-shell";

export function TicketsByAssetChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ChartCard
      title="Equipos que más fallan"
      subtitle="candidatos a reemplazo"
      isEmpty={data.length === 0}
      emptyText="Todavía no hay tickets vinculados a un equipo. Se vinculan desde la ficha del ticket."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid stroke={CHART.grid} horizontal={false} />
          <XAxis
            type="number"
            {...AXIS_PROPS}
            axisLine={{ stroke: CHART.axisLine }}
            allowDecimals={false}
          />
          <YAxis type="category" dataKey="name" {...AXIS_PROPS} axisLine={false} width={150} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: CHART.hover }} />
          <Bar
            dataKey="count"
            name="Tickets"
            fill={CHART.brandSoft}
            radius={[0, 4, 4, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
