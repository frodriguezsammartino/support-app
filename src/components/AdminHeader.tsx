"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Home,
  KeyRound,
  LogOut,
  Menu,
  Monitor,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { adminLogout } from "@/lib/actions/admin";

type Section = { href: string; label: string; short: string; icon: LucideIcon };

/** El orden en que se muestran las pestañas y el menú. */
const SECTIONS: Section[] = [
  { href: "/admin", label: "Panel de Tareas", short: "Tareas", icon: Home },
  { href: "/admin/mantenimiento", label: "Panel de Mantenimiento", short: "Mantenimiento", icon: Wrench },
  { href: "/admin/licencias", label: "Licencias y Servicios", short: "Licencias", icon: KeyRound },
  { href: "/admin/equipos", label: "Inventario de Equipos", short: "Equipos", icon: Monitor },
  { href: "/admin/dashboard", label: "Dashboard", short: "Dashboard", icon: BarChart3 },
];

/**
 * Cuál sección está activa. "/admin" es prefijo de todas las demás, así que se
 * busca de más específico a más general y gana el primero que matchea; si no,
 * cualquier subruta marcaría también la pestaña de Tareas.
 */
function activeHref(pathname: string) {
  const match = [...SECTIONS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`));
  return match?.href ?? "/admin";
}

function activeSection(pathname: string) {
  const href = activeHref(pathname);
  return SECTIONS.find((s) => s.href === href) ?? SECTIONS[0];
}

export function AdminHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const current = activeSection(pathname);
  const currentHref = activeHref(pathname);

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/admin" className="shrink-0">
          <Image
            src="/logo.webp"
            alt="Clínica de Fracturas y Ortopedia"
            width={200}
            height={100}
            className="h-12 w-auto object-contain"
            priority
          />
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => adminLogout()}
            className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-brand-tint hover:text-brand lg:inline-flex"
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </button>

          <button
            type="button"
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="inline-flex size-10 items-center justify-center rounded-lg border border-line text-ink transition-colors hover:bg-brand-tint lg:hidden"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      <div className="bg-brand">
        <div className="mx-auto max-w-6xl px-4">
          {/* Celular: la banda solo dice dónde estás. La navegación va en el panel. */}
          <div className="flex items-center justify-between gap-4 py-2.5 lg:hidden">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white">
              Panel técnico
            </span>
            <h1 className="text-sm font-medium text-white/80">{current.label}</h1>
          </div>

          {/* Escritorio: la banda se convierte en la barra de pestañas. */}
          <nav className="hidden items-center gap-6 lg:flex">
            <span className="shrink-0 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
              Panel técnico
            </span>
            <div className="flex items-center">
              {SECTIONS.map((section) => {
                const active = section.href === currentHref;
                const Icon = section.icon;
                return (
                  <Link
                    key={section.href}
                    href={section.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm transition-colors ${
                      active
                        ? "border-white bg-white/10 font-semibold text-white"
                        : "border-transparent text-white/75 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className="size-4" />
                    {section.short}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-ink/30"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-line bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Panel técnico
              </span>
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setMenuOpen(false)}
                className="inline-flex size-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-brand-tint hover:text-brand"
              >
                <X className="size-4" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-0.5 p-2">
              {SECTIONS.map((section) => {
                const active = section.href === currentHref;
                const Icon = section.icon;
                return (
                  <Link
                    key={section.href}
                    href={section.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 border-l-[3px] px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? "border-brand bg-brand-tint font-semibold text-brand"
                        : "border-transparent text-ink hover:bg-brand-tint/60"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    {section.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-line p-2">
              <button
                type="button"
                onClick={() => adminLogout()}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-muted transition-colors hover:bg-brand-tint hover:text-brand"
              >
                <LogOut className="size-4 shrink-0" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
