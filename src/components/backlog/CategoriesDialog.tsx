"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createCategory, deleteCategory, updateCategory } from "@/lib/actions/categories";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ManagedCategory = {
  id: string;
  name: string;
  active: boolean;
  askAsset: boolean;
  askProvider: boolean;
  tickets: number;
};

function Row({ category }: { category: ManagedCategory }) {
  const router = useRouter();
  const [name, setName] = useState(category.name);
  const [isPending, startTransition] = useTransition();

  function save(change: Partial<Pick<ManagedCategory, "name" | "active" | "askAsset" | "askProvider">>) {
    startTransition(async () => {
      const result = await updateCategory(category.id, {
        name: category.name,
        active: category.active,
        askAsset: category.askAsset,
        askProvider: category.askProvider,
        ...change,
      });
      if (result.error) {
        toast.error(result.error);
        setName(category.name);
        return;
      }
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className={`flex flex-col gap-2 py-3 ${category.active ? "" : "opacity-60"}`}>
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() !== category.name && save({ name })}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          disabled={isPending}
          aria-label="Nombre de la categoría"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title={category.active ? "Ocultar al cargar tickets" : "Volver a mostrar"}
          onClick={() => save({ active: !category.active })}
          disabled={isPending}
        >
          {category.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title={category.tickets > 0 ? `Tiene ${category.tickets} tickets: ocultala en vez de borrarla` : "Eliminar"}
          onClick={remove}
          disabled={isPending || category.tickets > 0}
          className="text-slate-400 hover:bg-[#FEE2E2] hover:text-[#991B1B]"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={category.askAsset}
            onChange={(e) => save({ askAsset: e.target.checked })}
            disabled={isPending}
          />
          Pregunta qué equipo es
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={category.askProvider}
            onChange={(e) => save({ askProvider: e.target.checked })}
            disabled={isPending}
          />
          Es un problema con un proveedor
        </label>
        <span>{category.tickets} ticket{category.tickets === 1 ? "" : "s"}</span>
      </div>
    </li>
  );
}

/** Solo el administrador: qué categorías hay y qué pregunta cada una al cargar un ticket. */
export function CategoriesDialog({ categories }: { categories: ManagedCategory[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();

  function add() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const result = await createCategory({ name: newName });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setNewName("");
      router.refresh();
    });
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Settings2 className="size-4" />
            Categorías
          </Button>
        }
      />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Categorías de tickets</DialogTitle>
          <DialogDescription>
            Lo que se elige al cargar un ticket. Una categoría con tickets no se borra: se oculta.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Nueva categoría"
            maxLength={60}
          />
          <Button onClick={add} disabled={isPending || !newName.trim()}>
            Agregar
          </Button>
        </div>

        <ul className="max-h-[50vh] divide-y divide-line overflow-y-auto">
          {categories.map((c) => (
            <Row key={`${c.id}:${c.name}:${c.active}:${c.askAsset}:${c.askProvider}`} category={c} />
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
