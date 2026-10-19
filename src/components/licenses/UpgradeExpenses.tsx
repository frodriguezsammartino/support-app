import Link from "next/link";
import { format } from "date-fns";
import { formatAmount } from "@/lib/licenses";
import { EXPENSE_WINDOW_MONTHS, STATUS_META, componentLabel } from "@/lib/requests";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type UpgradeExpenseRow = {
  id: string;
  number: number;
  assetId: string | null;
  targetLabel: string;
  title: string;
  component: string | null;
  requestedBy: string;
  status: "PENDING" | "APPROVED";
  costCents: number | null;
  estimatedCostCents: number | null;
  currency: string;
  /** Cuándo se aprobó (el gasto) o, si sigue pendiente, cuándo se pidió. */
  at: Date;
};

/**
 * El gasto de mantenimiento de los equipos: mejoras y repuestos que el técnico
 * pidió y el admin aprobó. Las pendientes se ven con su estimación pero no suman:
 * todavía no es plata gastada.
 */
export function UpgradeExpenses({
  rows,
  totals,
}: {
  rows: UpgradeExpenseRow[];
  /** Total aprobado en la ventana, por moneda. */
  totals: Record<string, number>;
}) {
  const currencies = Object.keys(totals).sort();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-ink">Mejoras y repuestos</CardTitle>
          {currencies.length > 0 && (
            <span className="text-sm text-ink-muted">
              Últimos {EXPENSE_WINDOW_MONTHS} meses:{" "}
              <span className="font-semibold text-ink">
                {currencies.map((c) => `${c} ${formatAmount(totals[c])}`).join(" · ")}
              </span>
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400">
          RAM, discos, fuentes y otros repuestos que el técnico pidió y el administrador aprobó
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-4 pb-6 text-sm text-ink-muted">
            Todavía no hay mejoras. Se piden desde la ficha de cada equipo con «Solicitar mejora».
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Fecha</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>Qué</TableHead>
                <TableHead className="w-36">Pidió</TableHead>
                <TableHead className="w-44 text-right">Costo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const component = componentLabel(r.component);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-ink-muted">{format(r.at, "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      {r.assetId ? (
                        <Link href={`/admin/equipos/${r.assetId}`} className="text-brand hover:underline">
                          {r.targetLabel}
                        </Link>
                      ) : (
                        <span className="text-ink">{r.targetLabel}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-ink">{r.title}</span>
                      {component && <span className="block text-xs text-slate-400">{component}</span>}
                    </TableCell>
                    <TableCell className="text-ink-muted">{r.requestedBy}</TableCell>
                    <TableCell className="text-right">
                      {r.status === "APPROVED" ? (
                        r.costCents ? (
                          <span className="tabular-nums text-ink">
                            {r.currency} {formatAmount(r.costCents)}
                          </span>
                        ) : (
                          <span className="text-ink-muted/70">Sin costo</span>
                        )
                      ) : (
                        <div className="flex flex-col items-end leading-tight">
                          <Badge className={STATUS_META.PENDING.badgeClass}>Sin aprobar</Badge>
                          {r.estimatedCostCents ? (
                            <span className="mt-0.5 text-xs tabular-nums text-slate-400">
                              est. {r.currency} {formatAmount(r.estimatedCostCents)}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
