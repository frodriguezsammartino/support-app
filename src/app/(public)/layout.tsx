import { SiteHeader } from "@/components/SiteHeader";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
