"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createAsset } from "@/lib/actions/assets";
import {
  AssetFormFields,
  EMPTY_ASSET_FORM,
  fromDateInput,
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

export function NewAssetDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<AssetFormValues>(EMPTY_ASSET_FORM);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setValues(EMPTY_ASSET_FORM);
        setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" />
            Nuevo equipo
          </Button>
        }
      />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo equipo</DialogTitle>
          <DialogDescription>
            Solo el nombre es obligatorio. El resto lo podés completar después.
          </DialogDescription>
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
                const result = await createAsset({
                  ...values,
                  purchasedAt: fromDateInput(values.purchasedAt),
                  warrantyUntil: fromDateInput(values.warrantyUntil),
                });
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                setValues(EMPTY_ASSET_FORM);
                setOpen(false);
                toast.success("Equipo agregado.");
                router.refresh();
              });
            }}
          >
            {isPending ? "Guardando..." : "Agregar equipo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
