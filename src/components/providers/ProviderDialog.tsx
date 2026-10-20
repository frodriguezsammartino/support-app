"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createProvider, updateProvider } from "@/lib/actions/providers";
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
import { Textarea } from "@/components/ui/textarea";

export type EditableProvider = {
  id: string;
  name: string;
  covers: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

type Values = {
  name: string;
  covers: string;
  contactName: string;
  phone: string;
  email: string;
  notes: string;
};

const toValues = (p?: EditableProvider): Values => ({
  name: p?.name ?? "",
  covers: p?.covers ?? "",
  contactName: p?.contactName ?? "",
  phone: p?.phone ?? "",
  email: p?.email ?? "",
  notes: p?.notes ?? "",
});

/** Alta y edición de un proveedor. Solo el nombre es obligatorio. */
export function ProviderDialog({
  provider,
  trigger,
}: {
  /** Si viene, se edita; si no, se crea uno nuevo. */
  provider?: EditableProvider;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Values>(() => toValues(provider));
  const [isPending, startTransition] = useTransition();

  const set = (changes: Partial<Values>) => setValues((v) => ({ ...v, ...changes }));

  function submit() {
    startTransition(async () => {
      const result = provider
        ? await updateProvider(provider.id, values)
        : await createProvider(values);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(provider ? "Cambios guardados." : "Proveedor agregado.");
      if (!provider) setValues(toValues());
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setValues(toValues(provider));
        setOpen(next);
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{provider ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
          <DialogDescription>
            Solo el nombre es obligatorio. El resto lo podés completar después.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label>Nombre</Label>
            <Input
              autoFocus
              value={values.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Ej: Plustel"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>¿Qué nos da o qué soporte cubre? (opcional)</Label>
            <Input
              value={values.covers}
              onChange={(e) => set({ covers: e.target.value })}
              placeholder="Ej: Central telefónica"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Persona de contacto (opcional)</Label>
              <Input
                value={values.contactName}
                onChange={(e) => set({ contactName: e.target.value })}
                placeholder="Ej: Ing. Furfuro"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Teléfono (opcional)</Label>
              <Input
                inputMode="tel"
                value={values.phone}
                onChange={(e) => set({ phone: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Mail (opcional)</Label>
            <Input
              type="email"
              value={values.email}
              onChange={(e) => set({ email: e.target.value })}
              placeholder="soporte@proveedor.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              rows={2}
              value={values.notes}
              onChange={(e) => set({ notes: e.target.value })}
              placeholder="Ej: número de cliente, horario de atención, cómo se pide soporte"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Guardando..." : provider ? "Guardar cambios" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
