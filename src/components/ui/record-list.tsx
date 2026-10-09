import type { ReactNode } from "react";

/**
 * Las tablas se ven bien en escritorio pero obligan a scrollear de costado en el
 * celular. En vez de eso, abajo de 768px cada fila se dibuja como una tarjeta y la
 * tabla se esconde. Son dos marcados del mismo dato, no dos fuentes de verdad.
 */
export function DesktopTable({ children }: { children: ReactNode }) {
  return <div className="hidden md:block">{children}</div>;
}

export function MobileRecords({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2 md:hidden">{children}</div>;
}

export function RecordCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-line bg-white p-3 ${className}`}>{children}</div>
  );
}

/** Encabezado de la tarjeta: identificador a la izquierda, estado a la derecha. */
export function RecordTop({ children }: { children: ReactNode }) {
  return <div className="flex items-start justify-between gap-3">{children}</div>;
}

/** Un dato con su etiqueta, para el cuerpo de la tarjeta. */
export function RecordField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="min-w-0 text-right text-sm text-ink">{children}</div>
    </div>
  );
}

export function RecordFields({ children }: { children: ReactNode }) {
  return <div className="mt-2 flex flex-col divide-y divide-slate-100">{children}</div>;
}

/** Acciones al pie, a ancho completo. */
export function RecordActions({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 [&>*]:flex-1">
      {children}
    </div>
  );
}

export function EmptyRecords({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-ink-muted">
      {children}
    </p>
  );
}
