import Link from "next/link";
import Image from "next/image";
import { Lock } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.webp" alt="Clínica de Fracturas y Ortopedia" width={140} height={70} className="h-10 w-auto object-contain" priority />
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <Lock className="size-4" />
            <span className="hidden sm:inline">Acceso técnico</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
