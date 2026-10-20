"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_PROPS, CHART, ChartCard, TOOLTIP_STYLE } from "./chart-shell";

export type OsCount = { os: string; count: number; ended: boolean };

/** Cuántos equipos hay con cada sistema operativo; en rojo los que ya no tienen soporte. */
export function AssetsByOsChart({ data }: { data: OsCount[] }) {
  return (
    <ChartCard
      title="Equipos por sistema operativo"
      subtitle="en rojo, los que ya no reciben actualizaciones de seguridad"
      isEmpty={data.length === 0}
      emptyText="Cargá el sistema operativo de los equipos para ver esto."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 12, top: 4 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="os" {...AXIS_PROPS} axisLine={{ stroke: CHART.axisLine }} interval={0} />
          <YAxis {...AXIS_PROPS} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: CHART.hover }} />
          <Bar dataKey="count" name="Equipos" radius={[4, 4, 0, 0]} maxBarSize={56}>
            {data.map((d) => (
              <Cell key={d.os} fill={d.ended ? CHART.bad : CHART.good} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
