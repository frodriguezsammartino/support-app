"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#075573", "#5E96AB", "#166534"]; // blue, orange, aqua — fixed categorical order

export function TicketsByStatusChart({ data }: { data: { status: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tickets por estado</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="status" innerRadius={55} outerRadius={90} paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#FFFFFF" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
