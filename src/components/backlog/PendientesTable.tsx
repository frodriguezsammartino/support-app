"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { PriorityQuickEditor } from "@/components/tickets/PriorityQuickEditor";
import { CategoryQuickEditor } from "@/components/tickets/CategoryQuickEditor";
import { StatusQuickEditor } from "@/components/tickets/StatusQuickEditor";
import { deleteTicket } from "@/lib/actions/tickets";
import { PRIORITY_META, PRIORITY_ORDER, PRIORITY_RANK, STATUS_LABELS } from "@/lib/priority";
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
import { Button } from "@/components/ui/button";
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
import type { Category, Ticket, TicketStatus } from "@prisma/client";

type TicketRow = Ticket & { category: Category | null };
type SortField = "priority" | "waitTime" | "combined";

const SORT_LABELS: Record<SortField, string> = {
  priority: "Urgencia",
  waitTime: "Tiempo en espera",
  combined: "Urgencia + tiempo en espera",
};

function priorityRank(t: TicketRow) {
  return t.priority ? PRIORITY_RANK[t.priority] : 0;
}

export function PendientesTable({
  tickets,
  categories,
}: {
  tickets: TicketRow[];
  categories: { id: string; name: string }[];
}) {
  const [rows, setRows] = useState(tickets);

  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [reporterFilter, setReporterFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [sort, setSort] = useState<{ field: SortField; dir: "asc" | "desc" }>({
    field: "combined",
    dir: "desc",
  });

  const reporters = useMemo(
    () => Array.from(new Set(rows.map((t) => t.reporterName))).sort(),
    [rows]
  );

  const visibleRows = useMemo(() => {
    const result = rows.filter((t) => {
      if (categoryFilter !== "ALL" && t.categoryId !== categoryFilter) return false;
      if (reporterFilter !== "ALL" && t.reporterName !== reporterFilter) return false;
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
      return true;
    });

    return [...result].sort((a, b) => {
      let diff: number;
      if (sort.field === "combined") {
        // Más urgente primero; entre iguales, el que espera hace más tiempo primero.
        diff = priorityRank(b) - priorityRank(a) || a.createdAt.getTime() - b.createdAt.getTime();
      } else if (sort.field === "priority") {
        diff = priorityRank(a) - priorityRank(b);
      } else {
        // Tiempo en espera: fecha de creación más vieja = más tiempo esperando.
        diff = b.createdAt.getTime() - a.createdAt.getTime();
      }
      return sort.dir === "asc" ? -diff : diff;
    });
  }, [rows, categoryFilter, reporterFilter, statusFilter, priorityFilter, sort]);

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
          <span className="text-xs text-ink-muted">Estado</span>
          <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue>
                {(v: string) => (v === "ALL" ? "Todos" : STATUS_LABELS[v as TicketStatus])}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="BACKLOG">En Espera</SelectItem>
              <SelectItem value="IN_PROGRESS">En Progreso</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Urgencia</span>
          <Select value={priorityFilter} onValueChange={(v) => v && setPriorityFilter(v)}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue placeholder="Todas">
                {(v: string) => (v === "ALL" ? "Todas" : PRIORITY_META[v as keyof typeof PRIORITY_META]?.label)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              {PRIORITY_ORDER.map((p) => (
                <SelectItem key={p} value={p}>
                  {PRIORITY_META[p].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-ink-muted">Ordenar por</span>
          <div className="flex gap-1">
            <Select value={sort.field} onValueChange={(v) => v && setSort((s) => ({ ...s, field: v as SortField }))}>
              <SelectTrigger size="sm" className="w-52">
                <SelectValue>{(v: string) => SORT_LABELS[v as SortField]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="combined">Urgencia + tiempo en espera</SelectItem>
                <SelectItem value="priority">Urgencia</SelectItem>
                <SelectItem value="waitTime">Tiempo en espera</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSort((s) => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" }))}
              title={sort.dir === "asc" ? "Ascendente" : "Descendente"}
            >
              {sort.dir === "asc" ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
            </Button>
          </div>
        </div>
      </div>

      <MobileRecords>
        {visibleRows.length === 0 && (
          <EmptyRecords>No hay incidentes que coincidan con estos filtros.</EmptyRecords>
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
                  <TableHead>Estado</TableHead>
                  <TableHead>Tiempo en espera</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-ink-muted">
                      No hay incidentes que coincidan con estos filtros.
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
