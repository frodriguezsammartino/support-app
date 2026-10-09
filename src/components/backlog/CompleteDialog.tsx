"use client";

import { useState, useTransition } from "react";
import { completeTicket } from "@/lib/actions/tickets";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CompleteDialog({
  ticketId,
  ticketTitle,
  open,
  onOpenChange,
  onCompleted,
}: {
  ticketId: string | null;
  ticketTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setNote("");
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Completar ticket</DialogTitle>
          <DialogDescription>{ticketTitle}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Textarea
            rows={4}
            placeholder="¿Qué se hizo para resolverlo?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoFocus
          />
          {error && <p className="text-sm text-[#991B1B]">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={() => {
              if (!ticketId) return;
              if (note.trim().length < 5) {
                setError("Contá al menos brevemente qué se hizo.");
                return;
              }
              setError(null);
              const fd = new FormData();
              fd.set("ticketId", ticketId);
              fd.set("resolutionNote", note);
              startTransition(async () => {
                await completeTicket(undefined, fd);
                setNote("");
                onCompleted();
              });
            }}
          >
            {isPending ? "Guardando..." : "Marcar como completado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
