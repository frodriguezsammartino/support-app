"use client";

import { useState, useTransition } from "react";
import { updateTicketCategory } from "@/lib/actions/tickets";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CategoryQuickEditor({
  ticketId,
  categoryId,
  categories,
}: {
  ticketId: string;
  categoryId: string | null;
  categories: { id: string; name: string }[];
}) {
  // Siempre un string definido (nunca undefined): si el Select arranca "no controlado"
  // y luego pasa a controlado, Base UI tira un warning en consola.
  const [localCategoryId, setLocalCategoryId] = useState(categoryId ?? "");
  const [, startTransition] = useTransition();
  const labels = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  return (
    <Select
      value={localCategoryId}
      onValueChange={(value) => {
        if (!value) return;
        setLocalCategoryId(value);
        startTransition(() => {
          updateTicketCategory(ticketId, value);
        });
      }}
    >
      <SelectTrigger
        size="sm"
        className="h-7 w-auto gap-1 border-none bg-transparent px-1.5 shadow-none"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <SelectValue placeholder="Sin categoría">
          {(value: string) => labels[value] ?? "Sin categoría"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {categories.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
