"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BRAND = "#075573";

export function TicketsByAssetChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Equipos que más tickets generan</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <p className="flex h-full items-center justify-center px-6 text-center text-sm text-ink-muted">
            Todavía no hay tickets vinculados a un equipo. Vinculalos desde la ficha del ticket.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {/* Horizontal: los nombres de equipo son largos y no entran en el eje de abajo. */}
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid stroke="#E2E8F0" horizontal={false} />
              <XAxis
                type="number"
                stroke="#5E7A8A"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: "#94A3B8" }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#5E7A8A"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={140}
              />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} cursor={{ fill: "#F1F5F9" }} />
              <Bar dataKey="count" name="Tickets" fill={BRAND} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
