import { AdminHeader } from "@/components/AdminHeader";

export default function AdminProtectedLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <AdminHeader />
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</div>
    </div>
  );
}
