"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BRAND = "#075573";

export function ResolutionTimeChart({ data }: { data: { name: string; avgHours: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tiempo promedio de resolución por categoría (horas)</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 12 }}>
            <CartesianGrid stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="name" stroke="#5E7A8A" fontSize={12} tickLine={false} axisLine={{ stroke: "#94A3B8" }} />
            <YAxis stroke="#5E7A8A" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: "#f9f9f7" }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="avgHours" name="Horas promedio" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
