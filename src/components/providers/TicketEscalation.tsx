"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Mail, Pencil, Phone, Send, X } from "lucide-react";
import { toast } from "sonner";
import { clearEscalation, escalateTicket, updateEscalation } from "@/lib/actions/providers";
import { ESCALATION_META, ESCALATION_ORDER, type EscalationStatus } from "@/lib/escalation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ProviderOption = { id: string; name: string; contactName: string | null };

export type CurrentEscalation = {
  providerName: string;
  phone: string | null;
  email: string | null;
  contact: string | null;
  ref: string | null;
  status: EscalationStatus;
  escalatedAt: Date;
};

/** Elegir proveedor, contacto y número de reclamo: lo único que hace falta para escalar. */
function EscalateDialog({
  ticketId,
  providers,
}: {
  ticketId: string;
  providers: ProviderOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [providerId, setProviderId] = useState("");
  const [contact, setContact] = useState("");
  const [ref, setRef] = useState("");
  const [isPending, startTransition] = useTransition();

  function pick(id: string) {
    setProviderId(id);
    // El contacto arranca con el del proveedor; se puede cambiar para este caso.
    setContact(providers.find((p) => p.id === id)?.contactName ?? "");
  }

  function submit() {
    startTransition(async () => {
      const result = await escalateTicket({ ticketId, providerId, contact, ref });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Ticket escalado.");
      setProviderId("");
      setContact("");
      setRef("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Send className="size-4" />
            Escalar a un proveedor
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escalar a un proveedor</DialogTitle>
          <DialogDescription>
            El ticket sigue en progreso; queda marcado como esperando la respuesta del proveedor.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label>Proveedor</Label>
            <Select value={providerId} onValueChange={(v) => v && pick(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Elegí un proveedor">
                  {(v: string) => providers.find((p) => p.id === v)?.name ?? "Elegí un proveedor"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Contacto (opcional)</Label>
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Con quién se habla"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>N° de reclamo (opcional)</Label>
              <Input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="El que da el proveedor"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={isPending || !providerId}>
            {isPending ? "Escalando..." : "Escalar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Corregir el contacto o el número de reclamo de un escalamiento que ya está hecho. */
function EditEscalationDialog({
  ticketId,
  contact,
  refNumber,
}: {
  ticketId: string;
  contact: string | null;
  refNumber: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [contactValue, setContactValue] = useState(contact ?? "");
  const [refValue, setRefValue] = useState(refNumber ?? "");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await updateEscalation(ticketId, { contact: contactValue, ref: refValue });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setContactValue(contact ?? "");
          setRefValue(refNumber ?? "");
        }
        setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm">
            <Pencil className="size-4" />
            Editar
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contacto y reclamo</DialogTitle>
          <DialogDescription>Con quién se habla en el proveedor y su número de caso.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Contacto</Label>
            <Input value={contactValue} onChange={(e) => setContactValue(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>N° de reclamo</Label>
            <Input value={refValue} onChange={(e) => setRefValue(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * El escalamiento de un ticket a un proveedor externo. Es una etiqueta aparte del
 * estado del ticket: sirve para saber de quién se está esperando algo.
 */
export function TicketEscalation({
  ticketId,
  ticketCompleted,
  providers,
  escalation,
}: {
  ticketId: string;
  ticketCompleted: boolean;
  providers: ProviderOption[];
  escalation: CurrentEscalation | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (!escalation) {
    if (ticketCompleted) return null;
    if (providers.length === 0) {
      return (
        <p className="text-sm text-ink-muted">
          Para escalar un ticket a un proveedor, primero cargalo en{" "}
          <Link href="/admin/licencias?vista=proveedores" className="text-brand hover:underline">
            Proveedores
          </Link>
          .
        </p>
      );
    }
    return <EscalateDialog ticketId={ticketId} providers={providers} />;
  }

  const meta = ESCALATION_META[escalation.status];

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          <span className="text-ink-muted">Escalado a </span>
          <span className="font-medium text-ink">{escalation.providerName}</span>
          <span className="text-xs text-slate-400">
            {" "}
            · hace {formatDistanceToNow(escalation.escalatedAt, { locale: es })}
          </span>
        </p>

        <Select
          value={escalation.status}
          onValueChange={(v) =>
            v && v !== escalation.status && run(() => updateEscalation(ticketId, { status: v as EscalationStatus }))
          }
          disabled={isPending}
        >
          <SelectTrigger
            size="sm"
            aria-label="Estado del escalamiento"
            className={`h-7 w-auto gap-1 rounded-full border-transparent px-2.5 text-xs font-medium ${meta.badgeClass}`}
          >
            <SelectValue>{(v: string) => ESCALATION_META[v as EscalationStatus].label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ESCALATION_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {ESCALATION_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
        {escalation.contact && <span>Contacto: {escalation.contact}</span>}
        {escalation.ref && <span>Reclamo: {escalation.ref}</span>}
        {escalation.phone && (
          <a href={`tel:${escalation.phone}`} className="flex items-center gap-1 text-brand hover:underline">
            <Phone className="size-3.5" />
            {escalation.phone}
          </a>
        )}
        {escalation.email && (
          <a href={`mailto:${escalation.email}`} className="flex items-center gap-1 text-brand hover:underline">
            <Mail className="size-3.5" />
            {escalation.email}
          </a>
        )}
      </div>

      <div className="flex items-center gap-1">
        <EditEscalationDialog ticketId={ticketId} contact={escalation.contact} refNumber={escalation.ref} />
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => {
            if (!confirm(`¿Quitar el escalamiento a ${escalation.providerName}?`)) return;
            run(() => clearEscalation(ticketId));
          }}
        >
          <X className="size-4" />
          Quitar escalamiento
        </Button>
      </div>
    </div>
  );
}
