import { Card, CardContent } from "@/components/ui/card";

/**
 * Semáforo de vencimientos. Cada estado ocupa su propio bloque con el color de
 * fondo del pill correspondiente: así se distinguen de un vistazo y el número
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

/** Cuántas hay al día, por vencer y vencidas. Cada pestaña lo cuenta solo para lo suyo. */
export function StatusCard({
  title,
  active,
  expired,
  expiring,
}: {
  title: string;
  active: number;
  expired: number;
  expiring: number;
}) {
  return (
    <Card>
      <CardContent className="flex h-full flex-col gap-3 py-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</span>
          <span className="text-xs text-slate-400">{`${active} activa${active === 1 ? "" : "s"}`}</span>
        </div>
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
  );
}
