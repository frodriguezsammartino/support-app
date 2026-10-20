"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { adminOnly, requireStaff } from "@/lib/adminAuth";
import { assetComponentSchema } from "@/lib/validations";
import { hasComponents } from "@/lib/components";

export type ActionResult = { error?: string };

export type ComponentInput = { assetId: string; kind: string; description: string };

function revalidateAsset(assetId: string) {
  revalidatePath(`/admin/equipos/${assetId}`);
}

/** Las piezas se registran en las PC de escritorio: es donde se cambian y se amplían. */
export async function addAssetComponent(input: ComponentInput): Promise<ActionResult> {
  await requireStaff();

  const parsed = assetComponentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };

  const asset = await db.asset.findUnique({ where: { id: parsed.data.assetId }, select: { type: true } });
  if (!asset) return { error: "No se encontró el equipo." };
  if (!hasComponents(asset.type)) return { error: "Solo las PC de escritorio llevan componentes." };

  await db.assetComponent.create({ data: parsed.data });

  revalidateAsset(parsed.data.assetId);
  return {};
}

/** Cargar varias piezas de una vez: así se completa una PC nueva sin ir pieza por pieza. */
export async function addAssetComponents(
  assetId: string,
  items: { kind: string; description: string }[]
): Promise<ActionResult> {
  await requireStaff();

  const asset = await db.asset.findUnique({ where: { id: assetId }, select: { type: true } });
  if (!asset) return { error: "No se encontró el equipo." };
  if (!hasComponents(asset.type)) return { error: "Solo las PC de escritorio llevan componentes." };

  const valid = [];
  for (const item of items) {
    // Las líneas que quedaron vacías simplemente no se cargan.
    if (!item.description.trim()) continue;
    const parsed = assetComponentSchema.safeParse({ assetId, ...item });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
    valid.push(parsed.data);
  }
  if (valid.length === 0) return { error: "Completá al menos una pieza." };

  await db.assetComponent.createMany({ data: valid });

  revalidateAsset(assetId);
  return {};
}

/** Cambiar lo que tiene una pieza (por ejemplo, después de ampliar la RAM). */
export async function updateAssetComponent(
  componentId: string,
  input: { kind: string; description: string }
): Promise<ActionResult> {
  await requireStaff();

  const current = await db.assetComponent.findUnique({ where: { id: componentId } });
  if (!current) return { error: "No se encontró la pieza." };

  const parsed = assetComponentSchema.safeParse({ assetId: current.assetId, ...input });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };

  await db.assetComponent.update({
    where: { id: componentId },
    data: { kind: parsed.data.kind, description: parsed.data.description },
  });

  revalidateAsset(current.assetId);
  return {};
}

/** Quitar una pieza es borrar: solo el administrador. */
export async function deleteAssetComponent(componentId: string): Promise<ActionResult> {
  const denied = await adminOnly();
  if (denied) return denied;

  const current = await db.assetComponent.findUnique({ where: { id: componentId } });
  if (!current) return { error: "No se encontró la pieza." };

  await db.assetComponent.delete({ where: { id: componentId } });

  revalidateAsset(current.assetId);
  return {};
}
