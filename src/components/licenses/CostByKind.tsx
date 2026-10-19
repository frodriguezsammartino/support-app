import { KIND_LABELS, KIND_ORDER, formatAmount, type LicenseKind } from "@/lib/licenses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type KindTotals = Record<LicenseKind, Record<string, number>>;

/**
 * En qué se va el gasto fijo de sistemas. Licencias y servicios conviven en la
 * misma tabla justamente para poder ver el total junto, pero separar por tipo es
 * lo que permite decidir dónde recortar.
 */
export function CostByKind({
  totals,
  currencies,
  upgrades = {},
}: {
  totals: KindTotals;
  currencies: string[];
  /**
   * Mejoras y repuestos aprobados en los últimos 12 meses, por moneda. A diferencia
   * del resto es plata ya gastada y no se repite sola, pero entra en el total para
   * ver el costo completo de sistemas.
   */
  upgrades?: Record<string, number>;
}) {
  const rows = KIND_ORDER.filter((kind) =>
    currencies.some((currency) => (totals[kind]?.[currency] ?? 0) > 0)
  );
  const hasUpgrades = currencies.some((currency) => (upgrades[currency] ?? 0) > 0);

  if ((rows.length === 0 && !hasUpgrades) || currencies.length === 0) return null;

  const grand = Object.fromEntries(
    currencies.map((currency) => [
      currency,
      KIND_ORDER.reduce((sum, kind) => sum + (totals[kind]?.[currency] ?? 0), 0) +
        (upgrades[currency] ?? 0),
    ])
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-ink">Gasto anual por tipo</CardTitle>
        <p className="text-xs text-slate-400">en qué se va el gasto fijo de sistemas</p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              {currencies.map((currency) => (
                <TableHead key={currency} className="w-40 text-right">
                  {currency}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((kind) => (
              <TableRow key={kind}>
                <TableCell className="text-ink">{KIND_LABELS[kind]}</TableCell>
                {currencies.map((currency) => {
                  const cents = totals[kind]?.[currency] ?? 0;
                  return (
                    <TableCell key={currency} className="text-right tabular-nums">
                      {cents > 0 ? (
                        formatAmount(cents)
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}

            {hasUpgrades && (
              <TableRow>
                <TableCell className="text-ink">
                  Mejoras y repuestos
                  <span className="block text-xs text-slate-400">
                    últimos 12 meses · gasto ya realizado, no se repite solo
                  </span>
                </TableCell>
                {currencies.map((currency) => {
                  const cents = upgrades[currency] ?? 0;
                  return (
                    <TableCell key={currency} className="text-right tabular-nums">
                      {cents > 0 ? formatAmount(cents) : <span className="text-slate-300">—</span>}
                    </TableCell>
                  );
                })}
              </TableRow>
            )}

            <TableRow className="bg-slate-50">
              <TableCell className="font-semibold text-ink">Total</TableCell>
              {currencies.map((currency) => (
                <TableCell
                  key={currency}
                  className="text-right font-semibold tabular-nums text-ink"
                >
                  {formatAmount(grand[currency] ?? 0)}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
