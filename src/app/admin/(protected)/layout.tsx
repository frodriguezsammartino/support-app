import { AdminHeader } from "@/components/AdminHeader";

// El panel muestra siempre el estado real de la base: si Next prerenderiza estas
// rutas en el build, Vercel sirve el HTML congelado del deploy y los cambios
// (marcar una tarea como hecha, crear un ticket) no se ven hasta el próximo build.
export const dynamic = "force-dynamic";

export default function AdminProtectedLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <AdminHeader />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</div>
    </div>
  );
}
