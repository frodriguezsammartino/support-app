import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle2, Sun, Ticket as TicketIcon, Wrench } from "lucide-react";
import { MAINTENANCE_STATUS_META, type MaintenanceRow } from "@/lib/maintenance";
import { PRIORITY_META, STATUS_LABELS } from "@/lib/priority";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Category, Ticket } from "@prisma/client";

type TicketRow = Ticket & { category: Category | null };

export function TodayPanel({
  tickets,
  maintenance,
}: {
  tickets: TicketRow[];
  maintenance: MaintenanceRow[];
}) {
  const total = tickets.length + maintenance.length;

  return (
    <Card className="border-t-4 border-t-blue-600">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sun className="size-5 text-blue-600" />
          <CardTitle className="text-base">
            Hoy
            {total > 0 && (
              <span className="ml-2 text-sm font-normal text-zinc-500">
                {total} cosa{total === 1 ? "" : "s"} para atender
              </span>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {total === 0 && (
          <p className="flex items-center gap-2 text-sm text-zinc-600">
            <CheckCircle2 className="size-4 text-[#0ca30c]" />
            No hay nada urgente ni mantenimientos por vencer. Todo al día.
          </p>
        )}

        {/* Primero el mantenimiento vencido: es lo que nadie viene a reclamar. */}
        {maintenance.map((task) => {
          const meta = MAINTENANCE_STATUS_META[task.status];
          return (
            <div
              key={task.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 ${meta.rowClass}`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <Wrench className="size-4 shrink-0 text-emerald-700" />
                <Link
                  href={`/admin/mantenimiento/${task.id}`}
                  className="truncate text-sm font-medium hover:underline"
                >
                  {task.title}
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${meta.textClass}`}>
                  {task.status === "OVERDUE"
                    ? `venció hace ${formatDistanceToNow(task.nextDueAt, { locale: es })}`
                    : `vence en ${formatDistanceToNow(task.nextDueAt, { locale: es })}`}
                  <span className="ml-1 font-normal text-zinc-400">
                    ({format(task.nextDueAt, "dd/MM HH:mm")})
                  </span>
                </span>
                <Badge className={meta.badgeClass}>{meta.label}</Badge>
              </div>
            </div>
          );
        })}

        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
          >
            <div className="flex min-w-0 items-center gap-2">
              <TicketIcon className="size-4 shrink-0 text-blue-700" />
              <Link
                href={`/admin/tickets/${ticket.id}`}
                className="truncate text-sm font-medium hover:underline"
              >
                <span className="text-zinc-400">#{ticket.number}</span> {ticket.title}
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">
                {STATUS_LABELS[ticket.status]} · hace{" "}
                {formatDistanceToNow(ticket.createdAt, { locale: es })}
              </span>
              {ticket.priority && (
                <Badge className={PRIORITY_META[ticket.priority].badgeClass}>
                  {PRIORITY_META[ticket.priority].label}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
