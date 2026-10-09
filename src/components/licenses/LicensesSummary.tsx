import { formatAmount } from "@/lib/licenses";
import { Card, CardContent } from "@/components/ui/card";

type MoneyRow = { currency: string; cents: number };

function MoneyCard({
  title,
  subtitle,
  rows,
  accent = false,
}: {
  title: string;
  subtitle?: string;
  rows: MoneyRow[];
  /** El del mes en curso se destaca: es el número que se mira primero. */
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-t-4 border-t-brand" : undefined}>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-ink">{title}</span>
          {subtitle && <span className="text-xs capitalize text-slate-400">{subtitle}</span>}
        </div>

        {rows.length === 0 ? (
          <span className="text-2xl font-semibold text-slate-300">—</span>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100">
            {rows.map((row) => (
              <div key={row.currency} className="flex items-baseline justify-between gap-3 py-1.5">
                <span className="text-xs font-medium tracking-wide text-slate-400">
                  {row.currency}
                </span>
                <span
                  className={`text-xl font-semibold tabular-nums ${
                    row.cents > 0 ? "text-ink" : "text-slate-300"
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

function Stat({ label, value, dotClass }: { label: string; value: number; dotClass: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xl font-semibold leading-none tabular-nums">{value}</span>
      <span className="flex items-center gap-1.5 text-xs text-ink-muted">
        <span className={`size-2 rounded-full ${dotClass}`} />
        {label}
      </span>
    </div>
  );
}

export function LicensesSummary({
  active,
  expired,
  expiring,
  monthRows,
  monthLabel,
  annualRows,
}: {
  active: number;
  expired: number;
  expiring: number;
  monthRows: MoneyRow[];
  monthLabel: string;
  annualRows: MoneyRow[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardContent className="flex h-full flex-col justify-between gap-4 py-4">
          <span className="text-sm font-medium text-ink">Estado del inventario</span>
          <div className="flex items-end justify-between gap-4">
            <Stat label="Activas" value={active} dotClass="bg-[#166534]" />
            <Stat label="Vencidas" value={expired} dotClass="bg-[#991B1B]" />
            <Stat label="Por vencer" value={expiring} dotClass="bg-[#92400E]" />
          </div>
        </CardContent>
      </Card>

      <MoneyCard title="A pagar este mes" subtitle={monthLabel} rows={monthRows} accent />
      <MoneyCard title="Gasto anual" subtitle="proyectado a 12 meses" rows={annualRows} />
    </div>
  );
}
