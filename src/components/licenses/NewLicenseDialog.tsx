"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createLicense } from "@/lib/actions/licenses";
import { parseMoneyToCents } from "@/lib/licenses";
import {
  EMPTY_LICENSE_FORM,
  LicenseFormFields,
  fromDateInput,
  type LicenseFormValues,
} from "./LicenseFormFields";
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

export function NewLicenseDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<LicenseFormValues>(EMPTY_LICENSE_FORM);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setValues(EMPTY_LICENSE_FORM);
        setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" />
            Nuevo
          </Button>
        }
      />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nueva licencia o servicio</DialogTitle>
          <DialogDescription>
            Una licencia de software o un servicio contratado: internet, telefonía, soporte.
          </DialogDescription>
        </DialogHeader>

        <LicenseFormFields
          values={values}
          onChange={(changes) => setValues((v) => ({ ...v, ...changes }))}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            disabled={isPending}
            onClick={() => {
              if (values.name.trim().length < 2) {
                toast.error("Ponele un nombre.");
                return;
              }
              startTransition(async () => {
                const result = await createLicense({
                  name: values.name,
                  kind: values.kind,
                  vendor: values.vendor,
                  seatsTotal: values.pricing === "UNLIMITED" ? 1 : Number(values.seatsTotal) || 1,
                  seatsAssigned:
                    values.pricing === "UNLIMITED" ? 0 : Number(values.seatsAssigned) || 0,
                  costCents: parseMoneyToCents(values.cost),
                  currency: values.currency,
                  billing: values.billing,
                  pricing: values.pricing,
                  expiresAt: fromDateInput(values.expiresAt),
                  autoRenew: values.autoRenew,
                  status: values.status,
                  notes: values.notes,
                });
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                setValues(EMPTY_LICENSE_FORM);
                setOpen(false);
                toast.success("Agregado.");
                router.refresh();
              });
            }}
          >
            {isPending ? "Guardando..." : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
