"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateLicense } from "@/lib/actions/licenses";
import {
  centsToInput,
  parseMoneyToCents,
  type Currency,
  type LicenseBilling,
  type LicenseKind,
  type LicensePricing,
  type LicenseStatus,
} from "@/lib/licenses";
import {
  LicenseFormFields,
  fromDateInput,
  toDateInput,
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

export type EditableLicense = {
  id: string;
  name: string;
  kind: LicenseKind;
  vendor: string | null;
  seatsTotal: number;
  seatsAssigned: number;
  costCents: number | null;
  currency: string;
  billing: LicenseBilling;
  pricing: LicensePricing;
  expiresAt: Date | null;
  autoRenew: boolean;
  status: LicenseStatus;
  notes: string | null;
};

function toFormValues(license: EditableLicense): LicenseFormValues {
  return {
    name: license.name,
    kind: license.kind,
    vendor: license.vendor ?? "",
    seatsTotal: String(license.seatsTotal),
    seatsAssigned: String(license.seatsAssigned),
    cost: centsToInput(license.costCents),
    currency: (license.currency === "USD" ? "USD" : "ARS") as Currency,
    billing: license.billing,
    pricing: license.pricing,
    expiresAt: toDateInput(license.expiresAt),
    autoRenew: license.autoRenew,
    status: license.status,
    notes: license.notes ?? "",
  };
}

export function EditLicenseDialog({ license }: { license: EditableLicense }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<LicenseFormValues>(() => toFormValues(license));
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setValues(toFormValues(license));
        setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-sm" title="Editar">
            <Pencil className="size-4" />
          </Button>
        }
      />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar</DialogTitle>
          <DialogDescription>{license.name}</DialogDescription>
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
                const result = await updateLicense(license.id, {
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
                setOpen(false);
                router.refresh();
              });
            }}
          >
            {isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
