"use client";

import Link from "next/link";
import Image from "next/image";
import { BarChart3, Home, LogOut, Menu } from "lucide-react";
import { adminLogout } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AdminHeader() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Image src="/logo.webp" alt="Logo" width={200} height={100} className="h-14 w-auto object-contain" />
          <span className="hidden self-center text-sm font-medium text-zinc-600 sm:inline">Panel técnico</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="icon">
                <Menu className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem render={<Link href="/admin" />}>
              <Home className="size-4" />
              Home
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
    </header>
  );
}
