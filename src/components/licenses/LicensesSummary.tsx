import { formatAmount } from "@/lib/licenses";
import { Card, CardContent } from "@/components/ui/card";

type MoneyRow = { currency: string; cents: number };

function CardTitleBlock({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</span>
      {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
    </div>
  );
}

/** Las dos cajas de plata son identicas: lo unico que cambia es el periodo. */
function MoneyCard({
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
        <CardTitleBlock title={title} subtitle={subtitle} />

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

/**
 * Semaforo del inventario. Cada estado ocupa su propio bloque con el color de
 * fondo del pill correspondiente: asi se distinguen de un vistazo y el numero
 * no queda flotando en el medio de la tarjeta.
 */
function TrafficItem({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className: string;
}) {
  return (
    <div
      className={`flex flex-1 flex-col items-center justify-center rounded-lg px-2 py-3 ${className}`}
    >
      <span className="text-3xl font-semibold leading-none tabular-nums">{value}</span>
      <span className="mt-1 text-xs font-medium">{label}</span>
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
  wastedRows,
}: {
  active: number;
  expired: number;
  expiring: number;
  monthRows: MoneyRow[];
  monthLabel: string;
  annualRows: MoneyRow[];
  wastedRows: MoneyRow[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardContent className="flex h-full flex-col gap-3 py-4">
          <CardTitleBlock title="Licencias y servicios" subtitle={`${active} activas`} />
          <div className="flex flex-1 items-stretch gap-2">
            <TrafficItem
              value={active - expiring - expired}
              label="Al día"
              className="bg-[#DCFCE7] text-[#166534]"
            />
            <TrafficItem
              value={expiring}
              label="Por vencer"
              className="bg-[#FEF3C7] text-[#92400E]"
            />
            <TrafficItem value={expired} label="Vencidas" className="bg-[#FEE2E2] text-[#991B1B]" />
          </div>
        </CardContent>
      </Card>

      <MoneyCard title="A pagar este mes" subtitle={monthLabel} rows={monthRows} />
      <MoneyCard title="Gasto anual" subtitle="proyectado a 12 meses" rows={annualRows} />
      <MoneyCard
        title="Se paga sin usar"
        subtitle="por año, solo licencias por puesto"
        rows={wastedRows}
        alert
      />
    </div>
  );
}
