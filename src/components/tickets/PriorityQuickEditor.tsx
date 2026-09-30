"use client";

import { useState, useTransition } from "react";
import { updateTicketPriority } from "@/lib/actions/tickets";
import { PRIORITY_META, PRIORITY_ORDER } from "@/lib/priority";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TicketPriority } from "@prisma/client";

export function PriorityQuickEditor({
  ticketId,
  priority,
}: {
  ticketId: string;
  priority: TicketPriority | null;
}) {
  // Siempre un string definido (nunca undefined): evita el warning de Base UI
  // por pasar de Select no controlado a controlado.
  const [localPriority, setLocalPriority] = useState<TicketPriority | "">(priority ?? "");
  const [, startTransition] = useTransition();

  return (
    <Select
      value={localPriority}
      onValueChange={(value) => {
        if (!value) return;
        const next = value as TicketPriority;
        setLocalPriority(next);
        startTransition(() => {
          updateTicketPriority(ticketId, next);
        });
      }}
    >
      <SelectTrigger
        size="sm"
        className="h-7 w-auto gap-1 border-none bg-transparent px-1.5 shadow-none"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <SelectValue placeholder="Sin clasificar">
          {(value: string) => (
            <span className="flex items-center gap-1.5 text-xs font-medium">
              <span className={`size-2 rounded-full ${PRIORITY_META[value as TicketPriority]?.dot ?? "bg-zinc-300"}`} />
              {PRIORITY_META[value as TicketPriority]?.label ?? "Sin clasificar"}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {PRIORITY_ORDER.map((p) => (
          <SelectItem key={p} value={p}>
            <span className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${PRIORITY_META[p].dot}`} />
              {PRIORITY_META[p].label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
