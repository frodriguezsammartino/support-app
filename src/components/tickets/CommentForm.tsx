"use client";

import { useActionState } from "react";
import { addComment } from "@/lib/actions/tickets";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CommentForm({ ticketId }: { ticketId: string }) {
  const [state, action, pending] = useActionState(addComment, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="ticketId" value={ticketId} />
      <Textarea name="body" rows={3} placeholder="Agregar una nota interna..." required />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending} variant="secondary" className="self-start">
        {pending ? "Guardando..." : "Agregar nota"}
      </Button>
    </form>
  );
}
