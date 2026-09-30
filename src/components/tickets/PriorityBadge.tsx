import { Badge } from "@/components/ui/badge";
import { PRIORITY_META } from "@/lib/priority";
import type { TicketPriority } from "@prisma/client";

export function PriorityBadge({ priority }: { priority: TicketPriority | null }) {
  if (!priority) return <Badge variant="outline">Sin clasificar</Badge>;
  const meta = PRIORITY_META[priority];
  return <Badge className={meta.badgeClass}>{meta.label}</Badge>;
}
