import { Badge } from "@/components/ui/badge";
import { MAINTENANCE_STATUS_META, type MaintenanceStatusKey } from "@/lib/maintenance";

export function MaintenanceStatusBadge({ status }: { status: MaintenanceStatusKey }) {
  const meta = MAINTENANCE_STATUS_META[status];
  return <Badge className={meta.badgeClass}>{meta.label}</Badge>;
}
