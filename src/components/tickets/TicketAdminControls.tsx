"use client";

import { useRouter } from "next/navigation";
import { PriorityQuickEditor } from "@/components/tickets/PriorityQuickEditor";
import { CategoryQuickEditor } from "@/components/tickets/CategoryQuickEditor";
import { StatusQuickEditor } from "@/components/tickets/StatusQuickEditor";
import { Card, CardContent } from "@/components/ui/card";
import type { Category, Ticket } from "@prisma/client";

export function TicketAdminControls({
  ticket,
  categories,
}: {
  ticket: Ticket & { category: Category | null };
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4 py-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Estado:</span>
          <StatusQuickEditor
            ticketId={ticket.id}
            title={ticket.title}
            status={ticket.status}
            categories={categories}
            onChanged={() => router.refresh()}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Urgencia:</span>
          <PriorityQuickEditor ticketId={ticket.id} priority={ticket.priority} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">Categoría:</span>
          <CategoryQuickEditor ticketId={ticket.id} categoryId={ticket.categoryId} categories={categories} />
        </div>
      </CardContent>
    </Card>
  );
}
