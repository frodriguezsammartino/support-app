"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateAsset } from "@/lib/actions/assets";
import type { AssetStatus, AssetType } from "@/lib/assets";
import {
  AssetFormFields,
  fromDateInput,
  toDateInput,
  type AssetFormValues,
} from "./AssetFormFields";
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

export type EditableAsset = {
  id: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  location: string | null;
  owner: string | null;
  purchasedAt: Date | null;
  warrantyUntil: Date | null;
  notes: string | null;
};

function toFormValues(asset: EditableAsset): AssetFormValues {
  return {
    name: asset.name,
    type: asset.type,
    status: asset.status,
    brand: asset.brand ?? "",
    model: asset.model ?? "",
    serialNumber: asset.serialNumber ?? "",
    location: asset.location ?? "",
    owner: asset.owner ?? "",
    purchasedAt: toDateInput(asset.purchasedAt),
    warrantyUntil: toDateInput(asset.warrantyUntil),
    notes: asset.notes ?? "",
  };
}

export function EditAssetDialog({ asset }: { asset: EditableAsset }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<AssetFormValues>(() => toFormValues(asset));
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setValues(toFormValues(asset));
        setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Pencil className="size-4" />
            Editar
          </Button>
        }
      />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar equipo</DialogTitle>
          <DialogDescription>{asset.name}</DialogDescription>
        </DialogHeader>

        <AssetFormFields
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
                toast.error("Ponele un nombre al equipo.");
                return;
              }
              startTransition(async () => {
                const result = await updateAsset(asset.id, {
                  ...values,
                  purchasedAt: fromDateInput(values.purchasedAt),
                  warrantyUntil: fromDateInput(values.warrantyUntil),
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
