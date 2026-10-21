"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { adminOnly } from "@/lib/adminAuth";
import { categorySchema } from "@/lib/validations";

export type ActionResult = { error?: string };

export type CategoryInput = {
  name: string;
  askAsset?: boolean;
  askProvider?: boolean;
  active?: boolean;
};

function revalidateCategories() {
  revalidatePath("/admin");
  revalidatePath("/admin/dashboard");
}

/** Las categorías las maneja el administrador. El técnico suma una nueva con "Otro" al cargar un ticket. */
export async function createCategory(input: CategoryInput): Promise<ActionResult> {
  const denied = await adminOnly();
  if (denied) return denied;

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };

  const clash = await db.category.findFirst({ where: { name: { equals: parsed.data.name, mode: "insensitive" } } });
  if (clash) return { error: "Ya hay una categoría con ese nombre." };

  await db.category.create({ data: parsed.data });
  revalidateCategories();
  return {};
}

export async function updateCategory(categoryId: string, input: CategoryInput): Promise<ActionResult> {
  const denied = await adminOnly();
  if (denied) return denied;

  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };

  const clash = await db.category.findFirst({
    where: { name: { equals: parsed.data.name, mode: "insensitive" }, id: { not: categoryId } },
  });
  if (clash) return { error: "Ya hay una categoría con ese nombre." };

  await db.category.update({ where: { id: categoryId }, data: parsed.data });
  revalidateCategories();
  return {};
}

/** Una categoría con tickets no se borra (se perdería su historia): se oculta. */
export async function deleteCategory(categoryId: string): Promise<ActionResult> {
  const denied = await adminOnly();
  if (denied) return denied;

  const used = await db.ticket.count({ where: { categoryId } });
  if (used > 0) {
    return {
      error: `Tiene ${used} ticket${used === 1 ? "" : "s"}: no se puede borrar. Ocultala y deja de aparecer al cargar.`,
    };
  }

  await db.category.delete({ where: { id: categoryId } });
  revalidateCategories();
  return {};
}
