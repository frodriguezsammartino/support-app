import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_PILL } from "@/lib/priority";
import type { TicketStatus } from "@prisma/client";

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <Badge className={STATUS_PILL[status]}>{STATUS_LABELS[status]}</Badge>;
}
