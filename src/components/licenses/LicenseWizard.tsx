"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { createLicense } from "@/lib/actions/licenses";
import {
  BILLING_LABELS,
  GROUP_KINDS,
  KIND_LABELS,
  PRICING_LABELS,
  formatAmount,
  hasSeats,
  parseMoneyToCents,
  totalCostCents,
  type LicenseGroup,
} from "@/lib/licenses";
import { normalizeUrl } from "@/lib/url";
import {
  StepBilling,
  StepCost,
  StepKind,
  StepName,
  StepNotes,
  StepRenewal,
  emptyLicenseForm,
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
import { useIsAdmin } from "@/components/RoleProvider";

type StepId = "kind" | "name" | "billing" | "cost" | "renewal" | "notes";

/**
 * Se carga de a poco, en el orden en que uno piensa: qué es, cómo se llama, cómo
 * se cobra, cuánto cuesta, cuándo vence y por último las notas. Un servicio
 * (internet, telefonía) no tiene puestos, así que saltea el paso de cómo se cobra;
 * una licencia ya sabe que es software, así que saltea el de qué es.
 */
const STEPS: Record<LicenseGroup, StepId[]> = {
  LICENSE: ["name", "billing", "cost", "renewal", "notes"],
  SERVICE: ["kind", "name", "cost", "renewal", "notes"],
};

const STEP_TITLES: Record<StepId, string> = {
  kind: "¿Qué es?",
  name: "Nombre y proveedor",
  billing: "¿Cómo se cobra?",
  cost: "Costo y periodicidad",
  renewal: "Vencimiento y renovación",
  notes: "Notas y enlace",
};

const COPY: Record<LicenseGroup, { trigger: string; title: string; description: string }> = {
  LICENSE: {
    trigger: "Nueva licencia",
    title: "Nueva licencia",
    description: "Una licencia de software: Office, antivirus, el sistema de la clínica.",
  },
  SERVICE: {
    trigger: "Nuevo servicio",
    title: "Nuevo servicio",
    description: "Un servicio o gasto fijo: internet, telefonía, hosting, soporte contratado.",
  },
};

/** Devuelve qué falta en el paso, o null si se puede avanzar. */
function validateStep(step: StepId, values: LicenseFormValues): string | null {
  if (step === "name" && values.name.trim().length < 2) return "Ponele un nombre.";

  if (step === "billing" && hasSeats(values.pricing)) {
    const total = Number(values.seatsTotal);
    const assigned = Number(values.seatsAssigned);
    if (!Number.isInteger(total) || total < 1) return "Tiene que haber al menos 1 puesto pago.";
    if (!Number.isInteger(assigned) || assigned < 0) return "Los puestos en uso no pueden ser negativos.";
  }

  if (step === "cost" && values.cost.trim() && parseMoneyToCents(values.cost) == null) {
    return "El costo no es un número válido. Ejemplo: 1500,50";
  }

  if (step === "notes" && normalizeUrl(values.url) === undefined) {
    return "El enlace no es válido. Ejemplo: https://portal.proveedor.com";
  }

  return null;
}

function Summary({ values, showMoney }: { values: LicenseFormValues; showMoney: boolean }) {
  const cents = totalCostCents({
    costCents: parseMoneyToCents(values.cost),
    pricing: values.pricing,
    seatsTotal: Number(values.seatsTotal) || 1,
    seatsAssigned: Number(values.seatsAssigned) || 0,
  });

  const rows: [string, string][] = [
    ["Tipo", KIND_LABELS[values.kind]],
    ["Nombre", values.vendor.trim() ? `${values.name.trim()} · ${values.vendor.trim()}` : values.name.trim()],
    [
      "Cobro",
      hasSeats(values.pricing)
        ? `${PRICING_LABELS[values.pricing]}, ${Number(values.seatsTotal) || 1} puesto${Number(values.seatsTotal) === 1 ? "" : "s"}`
        : PRICING_LABELS[values.pricing],
    ],
    ...(showMoney
      ? ([
          [
            "Costo",
            cents > 0
              ? `${values.currency} ${formatAmount(cents)} · ${BILLING_LABELS[values.billing]}`
              : "Sin costo cargado",
          ],
        ] as [string, string][])
      : []),
    [
      "Vencimiento",
      values.expiresAt
        ? `${values.expiresAt.split("-").reverse().join("/")}${values.autoRenew ? " · se renueva sola" : ""}`
        : "Sin fecha",
    ],
  ];

  return (
    <dl className="rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 py-1">
          <dt className="text-ink-muted">{label}</dt>
          <dd className="text-right font-medium text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function LicenseWizard({ group }: { group: LicenseGroup }) {
  const router = useRouter();
  // El costo lo completa el administrador: al técnico se le salta ese paso.
  const isAdmin = useIsAdmin();
  const steps = STEPS[group].filter((s) => isAdmin || s !== "cost");
  const copy = COPY[group];
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<LicenseFormValues>(() => emptyLicenseForm(group));
  const [isPending, startTransition] = useTransition();

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  function reset() {
    setValues(emptyLicenseForm(group));
    setStepIndex(0);
  }

  function next() {
    const problem = validateStep(step, values);
    if (problem) {
      toast.error(problem);
      return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function save() {
    // Se revisan todos los pasos: por si se volvió atrás y se rompió algo.
    for (const s of steps) {
      const problem = validateStep(s, values);
      if (problem) {
        toast.error(problem);
        setStepIndex(steps.indexOf(s));
        return;
      }
    }

    startTransition(async () => {
      const unlimited = values.pricing === "UNLIMITED";
      const result = await createLicense({
        name: values.name,
        kind: values.kind,
        vendor: values.vendor,
        seatsTotal: unlimited ? 1 : Number(values.seatsTotal) || 1,
        seatsAssigned: unlimited ? 0 : Number(values.seatsAssigned) || 0,
        costCents: parseMoneyToCents(values.cost),
        currency: values.currency,
        billing: values.billing,
        pricing: values.pricing,
        expiresAt: fromDateInput(values.expiresAt),
        autoRenew: values.autoRenew,
        status: "ACTIVE",
        notes: values.notes,
        url: values.url,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      reset();
      setOpen(false);
      toast.success("Agregado.");
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) reset();
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" />
            {copy.trigger}
          </Button>
        }
      />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            Paso {stepIndex + 1} de {steps.length} · {STEP_TITLES[step]}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1.5" aria-hidden>
          {steps.map((s, i) => (
            <span
              key={s}
              className={`h-1 flex-1 rounded-full ${i <= stepIndex ? "bg-brand" : "bg-line"}`}
            />
          ))}
        </div>

        <div className="min-h-40">
          {stepIndex === 0 && step !== "kind" && (
            <p className="mb-3 text-xs text-ink-muted">{copy.description}</p>
          )}
          {step === "kind" && (
            <StepKind
              values={values}
              onChange={(c) => setValues((v) => ({ ...v, ...c }))}
              kinds={GROUP_KINDS[group]}
            />
          )}
          {step === "name" && (
            <StepName values={values} onChange={(c) => setValues((v) => ({ ...v, ...c }))} />
          )}
          {step === "billing" && (
            <StepBilling values={values} onChange={(c) => setValues((v) => ({ ...v, ...c }))} />
          )}
          {step === "cost" && (
            <StepCost values={values} onChange={(c) => setValues((v) => ({ ...v, ...c }))} />
          )}
          {step === "renewal" && (
            <StepRenewal values={values} onChange={(c) => setValues((v) => ({ ...v, ...c }))} />
          )}
          {step === "notes" && (
            <div className="flex flex-col gap-4">
              <StepNotes values={values} onChange={(c) => setValues((v) => ({ ...v, ...c }))} />
              <Summary values={values} showMoney={isAdmin} />
            </div>
          )}
        </div>

        <DialogFooter>
          {stepIndex === 0 ? (
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setStepIndex((i) => Math.max(i - 1, 0))}
              disabled={isPending}
            >
              <ArrowLeft className="size-4" />
              Atrás
            </Button>
          )}
          {isLast ? (
            <Button onClick={save} disabled={isPending}>
              {isPending ? "Guardando..." : "Agregar"}
            </Button>
          ) : (
            <Button onClick={next} disabled={isPending}>
              Siguiente
              <ArrowRight className="size-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
