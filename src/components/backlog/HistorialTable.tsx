"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceStrict } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { ReopenControl } from "@/components/tickets/ReopenControl";
import { PriorityBadge } from "@/components/tickets/PriorityBadge";
import { deleteTicket } from "@/lib/actions/tickets";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import type { Category, Ticket } from "@prisma/client";

type TicketRow = Ticket & { category: Category | null };

export function HistorialTable({
  tickets,
  categories,
}: {
  tickets: TicketRow[];
  categories: { id: string; name: string }[];
}) {
  const [rows, setRows] = useState(tickets);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [reporterFilter, setReporterFilter] = useState("ALL");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const reporters = useMemo(
    () => Array.from(new Set(rows.map((t) => t.reporterName))).sort(),
    [rows]
  );

  const visibleRows = useMemo(() => {
    const result = rows.filter((t) => {
      if (categoryFilter !== "ALL" && t.categoryId !== categoryFilter) return false;
      if (reporterFilter !== "ALL" && t.reporterName !== reporterFilter) return false;
      return true;
    });
    return [...result].sort((a, b) => {
      const diff = (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0);
      return sortDir === "desc" ? diff : -diff;
    });
  }, [rows, categoryFilter, reporterFilter, sortDir]);

  function handleDelete(ticket: TicketRow) {
    if (!confirm(`¿Eliminar el ticket "${ticket.title}"? Esta acción no se puede deshacer.`)) return;
    setRows((prev) => prev.filter((t) => t.id !== ticket.id));
    deleteTicket(ticket.id);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Categoría</span>
          <Select value={categoryFilter} onValueChange={(v) => v && setCategoryFilter(v)}>
            <SelectTrigger size="sm" className="w-44">
              <SelectValue>
                {(v: string) => (v === "ALL" ? "Todas" : categories.find((c) => c.id === v)?.name ?? "Todas")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Reportado por</span>
          <Select value={reporterFilter} onValueChange={(v) => v && setReporterFilter(v)}>
            <SelectTrigger size="sm" className="w-44">
              <SelectValue>{(v: string) => (v === "ALL" ? "Todos" : v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {reporters.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Resuelto</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="w-32"
          >
            {sortDir === "desc" ? (
              <>
                <ArrowDown className="size-4" /> Más reciente
              </>
            ) : (
              <>
                <ArrowUp className="size-4" /> Más antiguo
              </>
            )}
          </Button>
        </div>
      </div>

      <MobileRecords>
        {visibleRows.length === 0 && <EmptyRecords>Todavía no hay tickets cerrados.</EmptyRecords>}

        {visibleRows.map((ticket) => (
          <RecordCard key={ticket.id}>
            <RecordTop>
              <Link href={`/admin/tickets/${ticket.id}`} className="min-w-0 font-medium text-ink">
                <span className="text-slate-400">#{ticket.number}</span> {ticket.title}
              </Link>
              <PriorityBadge priority={ticket.priority} />
            </RecordTop>

            <RecordFields>
              <RecordField label="Reportado por">{ticket.reporterName}</RecordField>
              <RecordField label="Categoría">{ticket.category?.name ?? "Sin categoría"}</RecordField>
              <RecordField label="Resuelto">
                {ticket.completedAt?.toLocaleDateString("es-AR") ?? "—"}
              </RecordField>
              <RecordField label="Duración total">
                {ticket.completedAt
                  ? formatDistanceStrict(ticket.createdAt, ticket.completedAt, { locale: es })
                  : "—"}
              </RecordField>
            </RecordFields>

            <RecordActions>
              <ReopenControl
                ticketId={ticket.id}
                title={ticket.title}
                categories={categories}
                onReopened={() => setRows((prev) => prev.filter((t) => t.id !== ticket.id))}
              />
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
                  <TableHead>Categoría</TableHead>
                  <TableHead>Urgencia</TableHead>
                  <TableHead>Resuelto</TableHead>
                  <TableHead>Duración total</TableHead>
                  <TableHead />
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-sm text-ink-muted">
                      Todavía no hay tickets cerrados.
                    </TableCell>
                  </TableRow>
                )}
                {visibleRows.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="text-slate-400">#{ticket.number}</TableCell>
                    <TableCell>
                      <Link href={`/admin/tickets/${ticket.id}`} className="font-medium text-ink hover:underline">
                        {ticket.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-ink-muted">{ticket.reporterName}</TableCell>
                    <TableCell className="text-ink-muted">{ticket.category?.name ?? "Sin categoría"}</TableCell>
                    <TableCell>
                      <PriorityBadge priority={ticket.priority} />
                    </TableCell>
                    <TableCell className="text-ink-muted">
                      {ticket.completedAt?.toLocaleDateString("es-AR") ?? "—"}
                    </TableCell>
                    <TableCell className="text-ink-muted">
                      {ticket.completedAt
                        ? formatDistanceStrict(ticket.createdAt, ticket.completedAt, { locale: es })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <ReopenControl
                        ticketId={ticket.id}
                        title={ticket.title}
                        categories={categories}
                        onReopened={() => setRows((prev) => prev.filter((t) => t.id !== ticket.id))}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(ticket)}
                        className="text-slate-400 hover:bg-[#FEE2E2] hover:text-[#991B1B]"
                      >
                        <Trash2 className="size-4" />
                      </Button>
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
