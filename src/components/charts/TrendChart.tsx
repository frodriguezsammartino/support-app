"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BLUE = "#2a78d6";

export function TrendChart({ data }: { data: { week: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tickets creados por semana</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 0, right: 12 }}>
            <CartesianGrid stroke="#e1e0d9" vertical={false} />
            <XAxis dataKey="week" stroke="#898781" fontSize={12} tickLine={false} axisLine={{ stroke: "#c3c2b7" }} />
            <YAxis stroke="#898781" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Line type="monotone" dataKey="count" name="Tickets" stroke={BLUE} strokeWidth={2} dot={{ r: 4, fill: BLUE }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
