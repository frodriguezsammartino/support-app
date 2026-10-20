"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ClipboardList, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  addAssetComponent,
  addAssetComponents,
  deleteAssetComponent,
  updateAssetComponent,
} from "@/lib/actions/components";
import { COMPONENT_KINDS, componentKindLabel } from "@/lib/components";
import { useIsAdmin } from "@/components/RoleProvider";
import { RequestDialog } from "@/components/requests/RequestDialog";
import type { AssetOption } from "@/components/assets/AssetPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ComponentRow = { id: string; kind: string; description: string };

/** Las piezas que más se piden al armar una PC desde cero. */
const STARTER_KINDS = ["CPU", "RAM", "DISCO", "FUENTE", "MONITOR"];

const PLACEHOLDERS: Record<string, string> = {
  CPU: "Ej: Intel Core i5 4570",
  RAM: "Ej: 8 GB DDR3",
  DISCO: "Ej: SSD 240 GB",
  FUENTE: "Ej: 500 W",
  MONITOR: "Ej: 19 pulgadas",
};

function KindSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger size="sm" className="w-44">
        <SelectValue>{(v: string) => componentKindLabel(v) ?? v}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {COMPONENT_KINDS.map((c) => (
          <SelectItem key={c.value} value={c.value}>
            {c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Lo que tiene cada PC por dentro. Con esto se sabe qué ampliar o cambiar sin
 * abrirla, y cada pieza tiene su atajo para pedirlo.
 */
export function AssetComponents({
  asset,
  components,
}: {
  asset: AssetOption;
  components: ComponentRow[];
}) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKind, setEditKind] = useState("OTRO");
  const [editText, setEditText] = useState("");
  const [adding, setAdding] = useState(false);
  const [newKind, setNewKind] = useState("OTRO");
  const [newText, setNewText] = useState("");
  const [starter, setStarter] = useState<Record<string, string>>({});

  function run(action: () => Promise<{ error?: string }>, after?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      after?.();
      router.refresh();
    });
  }

  function startEdit(row: ComponentRow) {
    setEditingId(row.id);
    setEditKind(row.kind);
    setEditText(row.description);
  }

  const known = { [asset.id]: components.map((c) => ({ kind: c.kind, description: c.description })) };

  // Una PC sin piezas cargadas arranca con un formulario corto para completarla de una vez.
  if (components.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-muted">
          Todavía no cargaste qué tiene esta PC. Completá lo que sepas: con eso es mucho más fácil
          pedir una mejora o un reemplazo.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {STARTER_KINDS.map((kind) => (
            <div key={kind} className="flex flex-col gap-1">
              <span className="text-xs text-ink-muted">{componentKindLabel(kind)}</span>
              <Input
                value={starter[kind] ?? ""}
                onChange={(e) => setStarter((s) => ({ ...s, [kind]: e.target.value }))}
                placeholder={PLACEHOLDERS[kind]}
              />
            </div>
          ))}
        </div>
        <div>
          <Button
            size="sm"
            disabled={isPending}
            onClick={() =>
              run(
                () =>
                  addAssetComponents(
                    asset.id,
                    STARTER_KINDS.map((kind) => ({ kind, description: starter[kind] ?? "" }))
                  ),
                () => setStarter({})
              )
            }
          >
            {isPending ? "Guardando..." : "Guardar componentes"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {components.map((row) =>
        editingId === row.id ? (
          <div key={row.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
            <KindSelect value={editKind} onChange={setEditKind} />
            <Input
              className="h-8 min-w-48 flex-1"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
            />
            <Button
              size="icon-sm"
              title="Guardar"
              aria-label="Guardar"
              disabled={isPending}
              onClick={() =>
                run(
                  () => updateAssetComponent(row.id, { kind: editKind, description: editText }),
                  () => setEditingId(null)
                )
              }
            >
              <Check className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Cancelar"
              aria-label="Cancelar"
              onClick={() => setEditingId(null)}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <div
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5"
          >
            <div className="min-w-0">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                {componentKindLabel(row.kind) ?? row.kind}
              </span>
              <p className="text-sm text-ink">{row.description}</p>
            </div>
            <div className="flex items-center gap-1">
              <RequestDialog
                assets={[asset]}
                assetId={asset.id}
                lockAsset
                componentsByAsset={known}
                initialKind="UPGRADE"
                initialComponent={row.kind}
                initialTitle={`Cambiar ${(componentKindLabel(row.kind) ?? row.kind).toLowerCase()} (${row.description})`}
                trigger={
                  <Button variant="ghost" size="sm" title="Pedir un cambio de esta pieza">
                    <ClipboardList className="size-4" />
                    <span className="hidden sm:inline">Solicitar cambio</span>
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="icon-sm"
                title="Editar"
                aria-label="Editar"
                onClick={() => startEdit(row)}
              >
                <Pencil className="size-4" />
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Quitar"
                  aria-label="Quitar"
                  disabled={isPending}
                  className="text-slate-400 hover:bg-[#FEE2E2] hover:text-[#991B1B]"
                  onClick={() => {
                    if (!confirm(`¿Quitar "${row.description}" de la lista de componentes?`)) return;
                    run(() => deleteAssetComponent(row.id));
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>
        )
      )}

      {adding ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-2">
          <KindSelect value={newKind} onChange={setNewKind} />
          <Input
            className="h-8 min-w-48 flex-1"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Qué tiene. Ej: Placa de video GT 710"
            autoFocus
          />
          <Button
            size="icon-sm"
            title="Agregar"
            aria-label="Agregar"
            disabled={isPending}
            onClick={() =>
              run(
                () => addAssetComponent({ assetId: asset.id, kind: newKind, description: newText }),
                () => {
                  setNewText("");
                  setAdding(false);
                }
              )
            }
          >
            <Check className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Cancelar"
            aria-label="Cancelar"
            onClick={() => setAdding(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="w-fit" onClick={() => setAdding(true)}>
          <Plus className="size-4" />
          Agregar un componente
        </Button>
      )}
    </div>
  );
}
