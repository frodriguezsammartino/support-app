import Link from "next/link";
import Image from "next/image";
import { Lock } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/" className="shrink-0">
          <Image
            src="/logo.webp"
            alt="Clínica de Fracturas y Ortopedia"
            width={200}
            height={100}
            className="h-12 w-auto object-contain"
            priority
          />
        </Link>

        <Link
          href="/admin"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-brand-tint hover:text-brand"
        >
          <Lock className="size-4" />
          <span className="hidden sm:inline">Acceso técnico</span>
        </Link>
      </div>
    </header>
  );
}
