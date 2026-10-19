"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createRetireRequest } from "@/lib/actions/requests";
import { PILL } from "@/lib/pills";
import { TARGET_LABELS, type RetireTarget } from "@/lib/requests";
import { useIsAdmin } from "@/components/RoleProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Marca en la fila: ya hay una baja pedida y el admin todavía no la resolvió. */
export function RetirePendingBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return <Badge className={PILL.warning}>Baja solicitada</Badge>;
}

function RequestRetireDialog({
  target,
  id,
  name,
  trigger,
}: {
  target: RetireTarget;
  id: string;
  name: string;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await createRetireRequest({ target, id, reason });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Solicitud enviada. El administrador la va a revisar.");
      setReason("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar la baja</DialogTitle>
          <DialogDescription>
            Vas a pedirle al administrador que dé de baja {TARGET_LABELS[target]} «{name}». No se
            borra nada hasta que él lo apruebe.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label>¿Por qué hay que darlo de baja?</Label>
          <Textarea
            autoFocus
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: no tiene arreglo, se tiró; el servicio se canceló; ya no hace falta"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Enviando..." : "Enviar solicitud"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * El botón de baja de cada fila, según quién mira: el admin elimina (con el flujo
 * de confirmación de cada tabla); el técnico pide la baja y queda pendiente.
 */
export function RetireControl({
  target,
  id,
  name,
  variant,
  pending,
  disabled,
  onDelete,
}: {
  target: RetireTarget;
  id: string;
  name: string;
  /** "button" = tarjeta en el celular; "icon" = fila de la tabla. */
  variant: "button" | "icon";
  /** Ya hay una baja pendiente de este objeto. */
  pending: boolean;
  disabled?: boolean;
  onDelete: () => void;
}) {
  const isAdmin = useIsAdmin();

  if (isAdmin) {
    return variant === "button" ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={onDelete}
        className="text-[#991B1B] hover:bg-[#FEE2E2] hover:text-[#991B1B]"
      >
        <Trash2 className="size-4" />
        Eliminar
      </Button>
    ) : (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title="Eliminar"
        disabled={disabled}
        onClick={onDelete}
        className="text-slate-400 hover:bg-[#FEE2E2] hover:text-[#991B1B]"
      >
        <Trash2 className="size-4" />
      </Button>
    );
  }

  // El técnico: si ya la pidió no hay nada más que hacer (la fila lo avisa).
  if (pending) return null;

  return (
    <RequestRetireDialog
      target={target}
      id={id}
      name={name}
      trigger={
        variant === "button" ? (
          <Button type="button" variant="outline" size="sm" disabled={disabled}>
            <FileX className="size-4" />
            Solicitar baja
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Solicitar baja"
            disabled={disabled}
            className="text-slate-400 hover:bg-[#FEF3C7] hover:text-[#92400E]"
          >
            <FileX className="size-4" />
          </Button>
        )
      }
    />
  );
}
