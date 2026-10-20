import Link from "next/link";

export type PageTab = {
  key: string;
  label: string;
  href: string;
  /** Un número o aviso al lado del nombre, para que se vea desde otra pestaña. */
  badge?: { text: string; tone: "danger" | "warning" };
};

const BADGE_TONE = {
  danger: "bg-[#FEE2E2] text-[#991B1B]",
  warning: "bg-[#FEF3C7] text-[#92400E]",
} as const;

/**
 * Pestañas dentro de una pantalla. Son enlaces (la pestaña elegida queda en la
 * dirección, ?vista=...), así cada una se calcula en el servidor solo cuando se
 * abre y se puede compartir o recargar sin perder dónde se estaba.
 */
export function PageTabs({ tabs, active }: { tabs: PageTab[]; active: string }) {
  return (
    <nav aria-label="Secciones" className="-mx-1 overflow-x-auto border-b border-line px-1">
      <div className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const selected = tab.key === active;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={selected ? "page" : undefined}
              className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors ${
                selected
                  ? "border-brand font-semibold text-brand"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {tab.label}
              {tab.badge && (
                <span
                  className={`rounded-full px-1.5 text-xs font-semibold ${BADGE_TONE[tab.badge.tone]}`}
                >
                  {tab.badge.text}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
