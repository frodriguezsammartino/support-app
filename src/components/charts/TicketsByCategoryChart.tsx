"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BRAND = "#075573";

export function TicketsByCategoryChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tickets por categoría</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 12 }}>
            <CartesianGrid stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="name" stroke="#5E7A8A" fontSize={12} tickLine={false} axisLine={{ stroke: "#94A3B8" }} />
            <YAxis stroke="#5E7A8A" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip cursor={{ fill: "#f9f9f7" }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="count" name="Tickets" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
