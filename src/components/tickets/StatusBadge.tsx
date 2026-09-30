import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/priority";
import type { TicketStatus } from "@prisma/client";

// Escala institucional: gris (a la espera) -> azul (en curso) -> negro (cerrado).
const CLASSES: Record<TicketStatus, string> = {
  BACKLOG: "bg-zinc-100 text-zinc-700 border-zinc-200",
  IN_PROGRESS: "bg-blue-600 text-white border-transparent",
  COMPLETED: "bg-zinc-900 text-white border-transparent",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge className={CLASSES[status]}>{STATUS_LABELS[status]}</Badge>;
}
