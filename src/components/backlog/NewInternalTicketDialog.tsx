"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { createInternalTicket } from "@/lib/actions/tickets";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY_META, PRIORITY_ORDER } from "@/lib/priority";
import { AssetPicker, type AssetOption } from "@/components/assets/AssetPicker";
import { WhenPicker } from "@/components/ui/when-picker";
import type { TicketPriority } from "@prisma/client";

export type CategoryOption = {
  id: string;
  name: string;
  askAsset: boolean;
  askProvider: boolean;
};

type StepId = "title" | "detail" | "category" | "priority" | "when";

const STEPS: StepId[] = ["title", "detail", "category", "priority", "when"];

const STEP_TITLES: Record<StepId, string> = {
  title: "¿Qué pasó?",
  detail: "Más detalle",
  category: "Categoría",
  priority: "Urgencia",
  when: "¿Cuándo pasó?",
};

/** Valor del selector para "Otro": una categoría nueva que queda guardada. */
const OTHER = "__other__";

const EMPTY = {
  title: "",
  description: "",
  categoryId: "",
  newCategoryName: "",
  providerId: "",
  assetId: "",
  priority: "" as TicketPriority | "",
};

export function NewInternalTicketDialog({
  categories,
  assets,
  providers,
  reporterName,
}: {
  categories: CategoryOption[];
  assets: AssetOption[];
  providers: { id: string; name: string }[];
  /** A nombre de quién queda: el técnico o el administrador, según quién esté logueado. */
  reporterName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [when, setWhen] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const isOther = form.categoryId === OTHER;
  const category = categories.find((c) => c.id === form.categoryId);
  const categoryLabel = (v: string) =>
    v === OTHER ? "Otro (agregar una categoría nueva)" : (categories.find((c) => c.id === v)?.name ?? "Elegí una categoría");

  function update<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setForm(EMPTY);
    setWhen(null);
    setStepIndex(0);
  }

  /** Qué falta en el paso, o null si se puede avanzar. */
  function problemWith(s: StepId): string | null {
    if (s === "title" && form.title.trim().length < 3) return "Contá en pocas palabras qué pasó (al menos 3 letras).";
    if (s === "category") {
      if (!form.categoryId) return "Elegí una categoría.";
      if (isOther && form.newCategoryName.trim().length < 2) return "Escribí el nombre de la categoría nueva.";
      if (category?.askProvider && !form.providerId) return "Elegí el proveedor.";
    }
    if (s === "priority" && !form.priority) return "Elegí la urgencia.";
    return null;
  }

  function next() {
    const problem = problemWith(step);
    if (problem) {
      toast.error(problem);
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function save() {
    for (const s of STEPS) {
      const problem = problemWith(s);
      if (problem) {
        toast.error(problem);
        setStepIndex(STEPS.indexOf(s));
        return;
      }
    }
    startTransition(async () => {
      const result = await createInternalTicket({
        title: form.title,
        description: form.description || undefined,
        ...(isOther ? { newCategoryName: form.newCategoryName } : { categoryId: form.categoryId }),
        providerId: category?.askProvider ? form.providerId : undefined,
        priority: form.priority as TicketPriority,
        assetId: category?.askAsset && form.assetId ? form.assetId : undefined,
        createdAt: when ?? undefined,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      reset();
      setOpen(false);
      toast.success("Ticket creado.");
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
            Nuevo ticket
          </Button>
        }
      />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo ticket</DialogTitle>
          <DialogDescription>
            Paso {stepIndex + 1} de {STEPS.length} · {STEP_TITLES[step]}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <span key={s} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? "bg-brand" : "bg-line"}`} />
          ))}
        </div>

        <div className="min-h-44">
          {step === "title" && (
            <div className="flex flex-col gap-2">
              <Label>Título del ticket</Label>
              <p className="text-xs text-ink-muted">
                Resumí en una línea qué pasó, cuál es el problema o qué hay que hacer. Es lo que se ve en la lista.
              </p>
              <Input
                autoFocus
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Ej: La PC de Admisión 2 no enciende"
                maxLength={150}
              />
            </div>
          )}

          {step === "detail" && (
            <div className="flex flex-col gap-2">
              <Label>Más detalle (opcional)</Label>
              <Textarea
                autoFocus
                rows={5}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Qué se vio, desde cuándo, qué se probó..."
              />
            </div>
          )}

          {step === "category" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Categoría</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(v) => {
                    if (!v) return;
                    // Lo que se preguntó para la categoría anterior no vale para la nueva.
                    setForm((prev) => ({ ...prev, categoryId: v, providerId: "", assetId: "" }));
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Elegí una categoría">{(v: string) => categoryLabel(v)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                    <SelectItem value={OTHER}>Otro (agregar una categoría nueva)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isOther && (
                <div className="flex flex-col gap-2">
                  <Label>¿Cómo se llama la categoría nueva?</Label>
                  <Input
                    autoFocus
                    value={form.newCategoryName}
                    onChange={(e) => update("newCategoryName", e.target.value)}
                    placeholder="Ej: Telefonía celular"
                    maxLength={60}
                  />
                  <p className="text-xs text-ink-muted">Queda guardada para los próximos tickets.</p>
                </div>
              )}

              {category?.askProvider && (
                <div className="flex flex-col gap-2">
                  <Label>¿Con qué proveedor?</Label>
                  <Select value={form.providerId} onValueChange={(v) => v && update("providerId", v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Elegí el proveedor">
                        {(v: string) => providers.find((p) => p.id === v)?.name ?? "Elegí el proveedor"}
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
                  <p className="text-xs text-ink-muted">
                    El ticket queda escalado a ese proveedor, esperando su respuesta.
                  </p>
                </div>
              )}

              {category?.askAsset && (
                <div className="flex flex-col gap-2">
                  <Label>¿Qué equipo? (opcional)</Label>
                  <AssetPicker assets={assets} value={form.assetId} onChange={(v) => update("assetId", v)} />
                </div>
              )}
            </div>
          )}

          {step === "priority" && (
            <div className="flex flex-col gap-2">
              <Label>¿Qué tan urgente es?</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {PRIORITY_ORDER.map((p) => {
                  const on = form.priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={on}
                      onClick={() => update("priority", p)}
                      className={`rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                        on ? "border-brand bg-brand-tint text-ink" : "border-line bg-white text-ink hover:bg-slate-50"
                      }`}
                    >
                      {PRIORITY_META[p].label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Queda montado para que el selector no pierda lo que se eligió al ir y volver. */}
          <div className={step === "when" ? "flex flex-col gap-4" : "hidden"}>
            <div className="flex flex-col gap-2">
              <Label>¿Cuándo pasó?</Label>
              <WhenPicker value={when} onChange={setWhen} />
            </div>
            <p className="rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm text-ink-muted">
              El ticket queda a nombre de <span className="font-medium text-ink">{reporterName}</span>.
            </p>
          </div>
        </div>

        <DialogFooter>
          {stepIndex === 0 ? (
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setStepIndex((i) => Math.max(i - 1, 0))} disabled={isPending}>
              <ArrowLeft className="size-4" />
              Atrás
            </Button>
          )}
          {isLast ? (
            <Button onClick={save} disabled={isPending}>
              {isPending ? "Guardando..." : "Crear ticket"}
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
