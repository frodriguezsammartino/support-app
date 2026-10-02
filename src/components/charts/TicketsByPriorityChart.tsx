"use client";

import { Bar, BarChart, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Mismo semáforo que usan las fichas y la tabla, en el mismo orden.
const PRIORITY_COLORS: Record<string, string> = {
  Baja: "#0ca30c",
  Media: "#fab219",
  Alta: "#ec835a",
  Urgente: "#d03b3b",
  "Sin clasificar": "#c3c2b7",
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
            <CartesianGrid stroke="#e1e0d9" vertical={false} />
            <XAxis
              dataKey="priority"
              stroke="#898781"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: "#c3c2b7" }}
            />
            <YAxis stroke="#898781" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} cursor={{ fill: "#f4f4f2" }} />
            <Bar dataKey="count" name="Tickets" radius={[4, 4, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.priority} fill={PRIORITY_COLORS[d.priority] ?? "#2a78d6"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
