"use client";

import { Bar, BarChart, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Mismo semáforo que usan las fichas y la tabla, en el mismo orden.
const PRIORITY_COLORS: Record<string, string> = {
  Baja: "#166534",
  Media: "#92400E",
  Alta: "#991B1B",
  Urgente: "#7F1D1D",
  "Sin clasificar": "#94A3B8",
};

export function TicketsByPriorityChart({ data }: { data: { priority: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tickets por urgencia</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 12 }}>
            <CartesianGrid stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="priority"
              stroke="#5E7A8A"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "#94A3B8" }}
            />
            <YAxis stroke="#5E7A8A" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} cursor={{ fill: "#F1F5F9" }} />
            <Bar dataKey="count" name="Tickets" radius={[4, 4, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.priority} fill={PRIORITY_COLORS[d.priority] ?? "#075573"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
