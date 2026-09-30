"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateTicketTitle } from "@/lib/actions/tickets";
import { Input } from "@/components/ui/input";

export function TicketTitleEditor({
  ticketId,
  title,
  inputClassName = "h-7 min-w-48",
  buttonClassName = "text-left font-medium hover:underline",
}: {
  ticketId: string;
  title: string;
  inputClassName?: string;
  buttonClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [isPending, startTransition] = useTransition();

  async function save() {
    setEditing(false);
    if (value.trim() === title.trim()) return;

    startTransition(async () => {
      const result = await updateTicketTitle(ticketId, value);
      if (result.error) {
        toast.error(result.error);
        setValue(title);
      }
    });
  }

  if (editing) {
    return (
      <Input
        autoFocus
        value={value}
        disabled={isPending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setValue(title);
            setEditing(false);
          }
        }}
        className={inputClassName}
      />
    );
  }

  return (
    <button type="button" onClick={() => setEditing(true)} className={buttonClassName} title="Click para editar">
      {value}
    </button>
  );
}
