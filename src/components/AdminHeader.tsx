"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BarChart3, Home, LogOut, Menu, Wrench } from "lucide-react";
import { adminLogout } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Ordenado de más específico a más general: gana el primer prefijo que matchea. */
const SECTIONS: { prefix: string; label: string }[] = [
  { prefix: "/admin/mantenimiento", label: "Panel de Mantenimiento" },
  { prefix: "/admin/dashboard", label: "Dashboard" },
  { prefix: "/admin/tickets", label: "Ticket" },
  { prefix: "/admin", label: "Panel de Tareas" },
];

function sectionLabel(pathname: string) {
  const match = SECTIONS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  return match?.label ?? "Panel de Tareas";
}

export function AdminHeader() {
  const pathname = usePathname();

  return (
    <header className="bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Image src="/logo.webp" alt="Logo" width={200} height={100} className="h-14 w-auto object-contain" />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="icon">
                <Menu className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem render={<Link href="/admin" />}>
              <Home className="size-4" />
              Panel de Tareas
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/admin/mantenimiento" />}>
              <Wrench className="size-4" />
              Panel de Mantenimiento
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/admin/dashboard" />}>
              <BarChart3 className="size-4" />
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => adminLogout()}>
              <LogOut className="size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="bg-[#184f95]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-white">
            Panel técnico
          </span>
          <h1 className="text-sm font-medium text-blue-100">{sectionLabel(pathname)}</h1>
        </div>
      </div>
    </header>
  );
}
