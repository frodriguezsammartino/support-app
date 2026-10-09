import { PRIORITY_META, PRIORITY_ORDER } from "@/lib/priority";
import { Card, CardContent } from "@/components/ui/card";
import type { Ticket, TicketPriority } from "@prisma/client";

/** Fondo y texto de cada bloque del semáforo, en el mismo orden que la urgencia. */
const BLOCK: Record<TicketPriority, string> = {
  LOW: "bg-[#DCFCE7] text-[#166534]",
  MEDIUM: "bg-[#FEF3C7] text-[#92400E]",
  HIGH: "bg-[#FFEDD5] text-[#9A3412]",
  URGENT: "bg-[#FEE2E2] text-[#991B1B]",
};

function Block({ value, label, className }: { value: number; label: string; className: string }) {
  return (
    <div
      className={`flex flex-1 flex-col items-center justify-center rounded-lg px-2 py-3 ${className}`}
    >
      <span className="text-3xl font-semibold leading-none tabular-nums">{value}</span>
      <span className="mt-1 text-center text-xs font-medium">{label}</span>
    </div>
  );
}

/**
 * Semáforo de lo que está abierto. Va de más urgente a menos, de izquierda a
 * derecha, para que lo primero que se lea sea lo que hay que atender.
 */
export function TasksSummary({ tickets }: { tickets: Ticket[] }) {
  const byPriority = Object.fromEntries(
    PRIORITY_ORDER.map((p) => [p, tickets.filter((t) => t.priority === p).length])
  ) as Record<TicketPriority, number>;

  const untriaged = tickets.filter((t) => !t.priority || !t.categoryId).length;
  const inProgress = tickets.filter((t) => t.status === "IN_PROGRESS").length;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Tickets abiertos
          </span>
          <span className="text-xs text-slate-400">
            {tickets.length} sin resolver
            {inProgress > 0 && ` · ${inProgress} en progreso`}
          </span>
        </div>

        <div className="flex items-stretch gap-2">
          {[...PRIORITY_ORDER].reverse().map((p) => (
            <Block
              key={p}
              value={byPriority[p]}
              label={PRIORITY_META[p].label}
              className={BLOCK[p]}
            />
          ))}
          {untriaged > 0 && (
            <Block
              value={untriaged}
              label="Sin clasificar"
              className="bg-[#E2E8F0] text-[#334155]"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
