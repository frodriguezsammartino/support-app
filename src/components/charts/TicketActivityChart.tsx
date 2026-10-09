"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_PROPS, CHART, ChartCard, TOOLTIP_STYLE } from "./chart-shell";

export type ActivityPoint = { week: string; creados: number; resueltos: number };

export function TicketActivityChart({ data }: { data: ActivityPoint[] }) {
  return (
    <ChartCard
      title="Entradas y salidas por semana"
      subtitle="si la línea de resueltos queda abajo, se está acumulando trabajo"
      isEmpty={data.length === 0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 0, right: 12, top: 4 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="week" {...AXIS_PROPS} axisLine={{ stroke: CHART.axisLine }} />
          <YAxis {...AXIS_PROPS} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="creados"
            name="Creados"
            stroke={CHART.brand}
            strokeWidth={2}
            dot={{ r: 3, fill: CHART.brand }}
          />
          <Line
            type="monotone"
            dataKey="resueltos"
            name="Resueltos"
            stroke={CHART.good}
            strokeWidth={2}
            dot={{ r: 3, fill: CHART.good }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
