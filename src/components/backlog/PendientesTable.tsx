"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { PriorityQuickEditor } from "@/components/tickets/PriorityQuickEditor";
import { CategoryQuickEditor } from "@/components/tickets/CategoryQuickEditor";
import { StatusQuickEditor } from "@/components/tickets/StatusQuickEditor";
import { deleteTicket } from "@/lib/actions/tickets";
import { ESCALATION_META, isOpenEscalation } from "@/lib/escalation";
import { PRIORITY_RANK } from "@/lib/priority";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/components/RoleProvider";
import {
  DesktopTable,
  EmptyRecords,
  MobileRecords,
  RecordActions,
  RecordCard,
  RecordField,
  RecordFields,
  RecordTop,
} from "@/components/ui/record-list";
import type { Category, Ticket } from "@prisma/client";

type TicketRow = Ticket & { category: Category | null; provider?: { name: string } | null };

/** "Plustel · esperando hace 3 días": de quién se espera algo, sin abrir el ticket. */
function EscalationBadge({ ticket }: { ticket: TicketRow }) {
  if (!ticket.escalationStatus || !ticket.provider) return null;
  const meta = ESCALATION_META[ticket.escalationStatus];
  return (
    <Badge className={meta.badgeClass}>
      {ticket.provider.name} · {meta.short}
      {ticket.escalatedAt && isOpenEscalation(ticket.escalationStatus)
        ? ` hace ${formatDistanceToNow(ticket.escalatedAt, { locale: es })}`
        : ""}
    </Badge>
  );
}
/** El técnico, salvo que el ticket esté escalado a un proveedor: ahí el responsable es el proveedor. */
function Responsible({ ticket, techName }: { ticket: TicketRow; techName: string }) {
  if (ticket.escalationStatus && ticket.provider) return <EscalationBadge ticket={ticket} />;
  return <span className="text-ink-muted">{techName}</span>;
}

function priorityRank(t: TicketRow) {
  return t.priority ? PRIORITY_RANK[t.priority] : 0;
}

export function PendientesTable({
  tickets,
  categories,
  techName,
}: {
  tickets: TicketRow[];
  categories: { id: string; name: string }[];
  /** Quién lleva los tickets que no están con un proveedor. */
  techName: string;
}) {
  const [rows, setRows] = useState(tickets);
  const isAdmin = useIsAdmin();

  // Siempre de más a menos urgente; entre iguales, el que espera hace más tiempo va primero.
  const visibleRows = useMemo(
    () =>
      [...rows].sort(
        (a, b) => priorityRank(b) - priorityRank(a) || a.createdAt.getTime() - b.createdAt.getTime()
      ),
    [rows]
  );

  function handleDelete(ticket: TicketRow) {
    if (!confirm(`¿Eliminar el ticket "${ticket.title}"? Esta acción no se puede deshacer.`)) return;
    setRows((prev) => prev.filter((t) => t.id !== ticket.id));
    deleteTicket(ticket.id);
  }

  return (
    <div className="flex flex-col gap-4">
      <MobileRecords>
        {visibleRows.length === 0 && (
          <EmptyRecords>No hay tickets pendientes.</EmptyRecords>
        )}

        {visibleRows.map((ticket) => (
          <RecordCard
            key={ticket.id}
            className={ticket.status === "IN_PROGRESS" ? "border-brand/30 bg-brand-tint/30" : ""}
          >
            <RecordTop>
              <Link href={`/admin/tickets/${ticket.id}`} className="min-w-0 font-medium text-ink">
                <span className="text-slate-400">#{ticket.number}</span> {ticket.title}
              </Link>
              <StatusQuickEditor
                ticketId={ticket.id}
                title={ticket.title}
                status={ticket.status}
                categories={categories}
                onChanged={(newStatus) => {
                  setRows((prev) => {
                    if (newStatus === "COMPLETED") return prev.filter((t) => t.id !== ticket.id);
                    return prev.map((t) => (t.id === ticket.id ? { ...t, status: newStatus } : t));
                  });
                }}
              />
            </RecordTop>

            <RecordFields>
              <RecordField label="Reportado por">{ticket.reporterName}</RecordField>
              <RecordField label="Responsable">
                <Responsible ticket={ticket} techName={techName} />
              </RecordField>
              <RecordField label="Categoría">
                <CategoryQuickEditor
                  ticketId={ticket.id}
                  categoryId={ticket.categoryId}
                  categories={categories}
                />
              </RecordField>
              <RecordField label="Urgencia">
                <PriorityQuickEditor ticketId={ticket.id} priority={ticket.priority} />
              </RecordField>
              <RecordField label="En espera">
                hace {formatDistanceToNow(ticket.createdAt, { locale: es })}
              </RecordField>
            </RecordFields>

            {isAdmin && (
              <RecordActions>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(ticket)}
                  className="text-[#991B1B] hover:bg-[#FEE2E2] hover:text-[#991B1B]"
                >
                  <Trash2 className="size-4" />
                  Eliminar
                </Button>
              </RecordActions>
            )}
          </RecordCard>
        ))}
      </MobileRecords>

      <DesktopTable>
        <Card className="py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Reportado por</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Urgencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tiempo en espera</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-sm text-ink-muted">
                      No hay tickets pendientes.
                    </TableCell>
                  </TableRow>
                )}
                {visibleRows.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className={ticket.status === "IN_PROGRESS" ? "bg-brand-tint/50 hover:bg-brand-tint" : undefined}
                  >
                    <TableCell className="text-slate-400">#{ticket.number}</TableCell>
                    <TableCell>
                      <Link href={`/admin/tickets/${ticket.id}`} className="font-medium text-ink hover:underline">
                        {ticket.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-ink-muted">{ticket.reporterName}</TableCell>
                    <TableCell>
                      <Responsible ticket={ticket} techName={techName} />
                    </TableCell>
                    <TableCell>
                      <CategoryQuickEditor ticketId={ticket.id} categoryId={ticket.categoryId} categories={categories} />
                    </TableCell>
                    <TableCell>
                      <PriorityQuickEditor ticketId={ticket.id} priority={ticket.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusQuickEditor
                        ticketId={ticket.id}
                        title={ticket.title}
                        status={ticket.status}
                        categories={categories}
                        onChanged={(newStatus) => {
                          setRows((prev) => {
                            if (newStatus === "COMPLETED") return prev.filter((t) => t.id !== ticket.id);
                            return prev.map((t) => (t.id === ticket.id ? { ...t, status: newStatus } : t));
                          });
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-ink-muted">
                      hace {formatDistanceToNow(ticket.createdAt, { locale: es })}
                    </TableCell>
                    <TableCell>
                      {isAdmin && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title="Eliminar"
                          onClick={() => handleDelete(ticket)}
                          className="text-slate-400 hover:bg-[#FEE2E2] hover:text-[#991B1B]"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </DesktopTable>
    </div>
  );
}
