"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TEAL = "#1baf7a";

export function MaintenanceTrendChart({ data }: { data: { week: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mantenimientos realizados por semana</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-zinc-500">
            Todavía no hay mantenimientos registrados en este período.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: 0, right: 12 }}>
              <CartesianGrid stroke="#e1e0d9" vertical={false} />
              <XAxis
                dataKey="week"
                stroke="#898781"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: "#c3c2b7" }}
              />
              <YAxis stroke="#898781" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line
                type="monotone"
                dataKey="count"
                name="Mantenimientos"
                stroke={TEAL}
                strokeWidth={2}
                dot={{ r: 4, fill: TEAL }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
