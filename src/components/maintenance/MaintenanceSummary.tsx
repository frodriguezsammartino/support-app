import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock } from "lucide-react";
import { MAINTENANCE_STATUS_META, type MaintenanceRow } from "@/lib/maintenance";
import { Card, CardContent } from "@/components/ui/card";

const COUNTERS = [
  { key: "OVERDUE", label: "Vencidas" },
  { key: "DUE_SOON", label: "Vencen pronto" },
  { key: "OK", label: "Al día" },
] as const;

export function MaintenanceSummary({ rows }: { rows: MaintenanceRow[] }) {
  const active = rows.filter((r) => r.active);
  const next = [...active].sort((a, b) => a.nextDueAt.getTime() - b.nextDueAt.getTime())[0];

  return (
    <Card className="border-t-4 border-t-blue-600">
      <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-0.5 size-5 shrink-0 text-blue-600" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Próxima tarea a vencer
            </span>
            {next ? (
              <>
                <Link
                  href={`/admin/mantenimiento/${next.id}`}
                  className="text-lg font-semibold leading-tight hover:underline"
                >
                  {next.title}
                </Link>
                <span className={`text-sm ${MAINTENANCE_STATUS_META[next.status].textClass}`}>
                  {next.status === "OVERDUE"
                    ? `Venció hace ${formatDistanceToNow(next.nextDueAt, { locale: es })}`
                    : `Vence en ${formatDistanceToNow(next.nextDueAt, { locale: es })}`}
                  <span className="font-normal text-zinc-500">
                    {" · "}
                    {format(next.nextDueAt, "dd/MM/yyyy HH:mm")}
                  </span>
                </span>
              </>
            ) : (
              <span className="text-sm text-zinc-500">No hay tareas activas todavía.</span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {COUNTERS.map(({ key, label }) => {
            const meta = MAINTENANCE_STATUS_META[key];
            const count = active.filter((r) => r.status === key).length;
            return (
              <div
                key={key}
                className="flex min-w-24 flex-col items-center gap-0.5 rounded-lg border bg-white px-3 py-2"
              >
                <span className="text-xl font-semibold leading-none">{count}</span>
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className={`size-2 rounded-full ${meta.dot}`} />
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
