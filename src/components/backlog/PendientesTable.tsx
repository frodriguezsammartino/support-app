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

/** De qué proveedor depende el ticket, solo el nombre: el estado ya lo dice. */
function ProviderName({ ticket }: { ticket: TicketRow }) {
  if (ticket.status !== "WAITING_PROVIDER" || !ticket.provider) return null;
  return <span className="text-xs text-ink-muted">{ticket.provider.name}</span>;
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
  /** El responsable de los tickets: el técnico, aunque dependan de un proveedor. */
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
                <span className="text-ink-muted">{techName}</span>
              </RecordField>
              <RecordField label="Categoría">
                <CategoryQuickEditor
                  ticketId={ticket.id}
                  categoryId={ticket.categoryId}
                  categories={categories}
                />
              </RecordField>
              {ticket.status === "WAITING_PROVIDER" && ticket.provider && (
                <RecordField label="Proveedor">{ticket.provider.name}</RecordField>
              )}
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
                      <span className="text-ink-muted">{techName}</span>
                    </TableCell>
                    <TableCell>
                      <CategoryQuickEditor ticketId={ticket.id} categoryId={ticket.categoryId} categories={categories} />
                    </TableCell>
                    <TableCell>
                      <PriorityQuickEditor ticketId={ticket.id} priority={ticket.priority} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
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
                        <ProviderName ticket={ticket} />
                      </div>
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
