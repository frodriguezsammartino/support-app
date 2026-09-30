"use client";

import { RotateCcw } from "lucide-react";
import { useTicketStatusFlow } from "@/components/tickets/useTicketStatusFlow";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TicketStatus } from "@prisma/client";

export function ReopenControl({
  ticketId,
  title,
  categories,
  onReopened,
}: {
  ticketId: string;
  title: string;
  categories: { id: string; name: string }[];
  onReopened: (newStatus: TicketStatus) => void;
}) {
  const { attemptChange, node } = useTicketStatusFlow({
    categories,
    onChanged: (_id, newStatus) => onReopened(newStatus),
  });

  return (
    <>
      <Select
        value=""
        onValueChange={(value) => {
          if (!value) return;
          attemptChange({ id: ticketId, title, status: "COMPLETED" }, value as TicketStatus);
        }}
      >
        <SelectTrigger size="sm" className="h-7 gap-1">
          <RotateCcw className="size-3.5 text-zinc-500" />
          <SelectValue placeholder="Reabrir" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="BACKLOG">A En Espera</SelectItem>
          <SelectItem value="IN_PROGRESS">A En Progreso</SelectItem>
        </SelectContent>
      </Select>
      {node}
    </>
  );
}
