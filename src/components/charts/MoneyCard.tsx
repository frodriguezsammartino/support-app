import { formatAmount } from "@/lib/licenses";
import { Card, CardContent } from "@/components/ui/card";

export type MoneyRow = { currency: string; cents: number };

/** Una caja de plata con una fila por moneda: las monedas nunca se suman entre sí. */
export function MoneyCard({
  title,
  subtitle,
  rows,
  alert = false,
}: {
  title: string;
  subtitle: string;
  rows: MoneyRow[];
  /** Plata desperdiciada: se marca en rojo para que no pase desapercibida. */
  alert?: boolean;
}) {
  const hasAmount = rows.some((r) => r.cents > 0);
  return (
    <Card className={alert && hasAmount ? "ring-[#FECACA]" : undefined}>
      <CardContent className="flex h-full flex-col gap-3 py-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</span>
          <span className="text-xs text-slate-400">{subtitle}</span>
        </div>

        {rows.length === 0 ? (
          <span className="text-2xl font-semibold text-slate-300">—</span>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100">
            {rows.map((row) => (
              <div key={row.currency} className="flex items-baseline justify-between gap-3 py-1.5">
                <span className="text-xs font-medium tracking-wide text-slate-500">
                  {row.currency}
                </span>
                <span
                  className={`text-xl font-semibold tabular-nums ${
                    row.cents === 0
                      ? "text-slate-300"
                      : alert
                        ? "text-[#991B1B]"
                        : "text-ink"
                  }`}
                >
                  {formatAmount(row.cents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
