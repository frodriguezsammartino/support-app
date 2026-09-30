import Link from "next/link";
import Image from "next/image";
import { BarChart3, Home, LogOut } from "lucide-react";
import { adminLogout } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/admin", label: "Home", icon: Home },
  { href: "/admin/dashboard", label: "Dashboard", icon: BarChart3 },
];

export default function AdminProtectedLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="border-b bg-zinc-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center rounded-lg bg-white px-3 py-1.5">
              <Image src="/logo.webp" alt="Logo" width={160} height={80} className="h-9 w-auto object-contain" />
            </span>
            <span className="hidden font-semibold sm:inline">Panel técnico</span>
          </div>
          <nav className="flex gap-1 text-sm font-medium">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-zinc-300 hover:bg-white/10 hover:text-white"
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={adminLogout}>
            <Button type="submit" variant="ghost" size="sm" className="text-zinc-300 hover:bg-white/10 hover:text-white">
              <LogOut className="size-4" />
              Cerrar sesión
            </Button>
          </form>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</div>
    </div>
  );
}
