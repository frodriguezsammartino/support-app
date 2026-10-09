"use client";

import { useTicketStatusFlow } from "./useTicketStatusFlow";
import { STATUS_CHIP, STATUS_DOT, STATUS_LABELS } from "@/lib/priority";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TicketStatus } from "@prisma/client";

const OPTIONS: TicketStatus[] = ["BACKLOG", "IN_PROGRESS", "COMPLETED"];

export function StatusQuickEditor({
  ticketId,
  title,
  status,
  categories,
  onChanged,
}: {
  ticketId: string;
  title: string;
  status: TicketStatus;
  categories: { id: string; name: string }[];
  onChanged: (newStatus: TicketStatus, extra?: Record<string, unknown>) => void;
}) {
  const { attemptChange, node } = useTicketStatusFlow({
    categories,
    onChanged: (_id, newStatus, extra) => onChanged(newStatus, extra),
  });

  return (
    <>
      <Select
        value={status}
        onValueChange={(value) => {
          if (!value) return;
          attemptChange({ id: ticketId, title, status }, value as TicketStatus);
        }}
      >
        <SelectTrigger
          size="sm"
          className={`h-7 w-auto gap-1 border ${STATUS_CHIP[status]}`}
        >
          <SelectValue placeholder="Estado">
            {(value: string) => (
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <span className={`size-2 rounded-full ${STATUS_DOT[value as TicketStatus]}`} />
                {STATUS_LABELS[value as TicketStatus]}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              <span className="flex items-center gap-1.5">
                <span className={`size-2 rounded-full ${STATUS_DOT[s]}`} />
                {STATUS_LABELS[s]}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {node}
    </>
  );
}
