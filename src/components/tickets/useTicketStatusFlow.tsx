"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateTicketStatus, reopenTicket } from "@/lib/actions/tickets";
import { STATUS_LABELS } from "@/lib/priority";
import { CompleteDialog } from "@/components/backlog/CompleteDialog";
import { TriageDialog } from "@/components/backlog/TriageDialog";
import { SuccessCelebration } from "@/components/backlog/SuccessCelebration";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { TicketStatus } from "@prisma/client";

const RANK: Record<TicketStatus, number> = { BACKLOG: 0, IN_PROGRESS: 1, COMPLETED: 2 };

type TicketRef = { id: string; title: string; status: TicketStatus };

export function useTicketStatusFlow({
  categories,
  onChanged,
}: {
  categories: { id: string; name: string }[];
  onChanged: (ticketId: string, newStatus: TicketStatus, extra?: Record<string, unknown>) => void;
}) {
  const [completeTarget, setCompleteTarget] = useState<TicketRef | null>(null);
  const [triageTarget, setTriageTarget] = useState<TicketRef | null>(null);
  const [backwardTarget, setBackwardTarget] = useState<{ ticket: TicketRef; to: TicketStatus } | null>(null);
  const [backwardPending, setBackwardPending] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const router = useRouter();

  function celebrateSuccess() {
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 1300);
  }

  /** Siempre le pregunta al servidor (nunca decide con datos locales, que pueden estar desactualizados). */
  async function attemptChange(ticket: TicketRef, target: TicketStatus) {
    if (target === ticket.status) return;

    if (target === "COMPLETED") {
      setCompleteTarget(ticket);
      return;
    }

    if (RANK[target] < RANK[ticket.status]) {
      setBackwardTarget({ ticket, to: target });
      return;
    }

    const result = await updateTicketStatus(ticket.id, target as "BACKLOG" | "IN_PROGRESS");
    if (result.error) {
      if (result.code === "MISSING_TRIAGE") {
        setTriageTarget(ticket);
      } else {
        toast.error(result.error);
      }
      return;
    }
    onChanged(ticket.id, target);
    router.refresh();
  }

  const node = (
    <>
      <CompleteDialog
        ticketId={completeTarget?.id ?? null}
        ticketTitle={completeTarget?.title ?? ""}
        open={completeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCompleteTarget(null);
        }}
        onCompleted={() => {
          if (completeTarget) onChanged(completeTarget.id, "COMPLETED", { completedAt: new Date() });
          setCompleteTarget(null);
          celebrateSuccess();
          router.refresh();
        }}
      />

      <TriageDialog
        ticketId={triageTarget?.id ?? null}
        ticketTitle={triageTarget?.title ?? ""}
        categories={categories}
        open={triageTarget !== null}
        onOpenChange={(open) => {
          if (!open) setTriageTarget(null);
        }}
        onDone={() => {
          if (triageTarget) onChanged(triageTarget.id, "IN_PROGRESS", { startedAt: new Date() });
          setTriageTarget(null);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={backwardTarget !== null}
        onOpenChange={(open) => {
          if (!open) setBackwardTarget(null);
        }}
        title="¿Estás seguro?"
        description={`"${backwardTarget?.ticket.title ?? ""}" va a volver a ${
          STATUS_LABELS[backwardTarget?.to ?? "IN_PROGRESS"]
        }.`}
        confirmLabel="Sí, mover"
        pending={backwardPending}
        onConfirm={() => {
          if (!backwardTarget) return;
          setBackwardPending(true);
          const { ticket, to } = backwardTarget;
          const call =
            ticket.status === "COMPLETED"
              ? reopenTicket(ticket.id, to as "BACKLOG" | "IN_PROGRESS")
              : updateTicketStatus(ticket.id, to as "BACKLOG" | "IN_PROGRESS");
          call.then((result) => {
            setBackwardPending(false);
            if (result.error) {
              toast.error(result.error);
              return;
            }
            onChanged(ticket.id, to, ticket.status === "COMPLETED" ? { completedAt: null, resolutionNote: null } : {});
            setBackwardTarget(null);
            router.refresh();
          });
        }}
      />

      <SuccessCelebration show={celebrate} />
    </>
  );

  return { attemptChange, node };
}
