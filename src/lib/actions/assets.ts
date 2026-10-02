"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { createAssetSchema, updateAssetSchema } from "@/lib/validations";
import type { AssetStatus, AssetType } from "@/lib/assets";

export type ActionResult = { error?: string };

export type AssetInput = {
  name: string;
  type: AssetType;
  status: AssetStatus;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  location?: string | null;
  purchasedAt?: Date | null;
  warrantyUntil?: Date | null;
  notes?: string | null;
};

function revalidateAssets(assetId?: string) {
  revalidatePath("/admin/equipos");
  if (assetId) revalidatePath(`/admin/equipos/${assetId}`);
  revalidatePath("/admin/dashboard");
}

/** Los campos de texto vacíos se guardan como null, no como "". */
function toAssetData(data: AssetInput) {
  return {
    name: data.name,
    type: data.type,
    status: data.status,
    brand: data.brand || null,
    model: data.model || null,
    serialNumber: data.serialNumber || null,
    location: data.location || null,
    purchasedAt: data.purchasedAt ?? null,
    warrantyUntil: data.warrantyUntil ?? null,
    notes: data.notes || null,
  };
}

export async function createAsset(input: AssetInput): Promise<ActionResult> {
  await requireAdmin();

  const parsed = createAssetSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }

  await db.asset.create({ data: toAssetData(parsed.data) });

  revalidateAssets();
  return {};
}

export async function updateAsset(assetId: string, input: AssetInput): Promise<ActionResult> {
  await requireAdmin();

  const parsed = updateAssetSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }

  await db.asset.update({ where: { id: assetId }, data: toAssetData(parsed.data) });

  revalidateAssets(assetId);
  return {};
}

export async function updateAssetStatus(assetId: string, status: AssetStatus): Promise<ActionResult> {
  await requireAdmin();

  await db.asset.update({ where: { id: assetId }, data: { status } });

  revalidateAssets(assetId);
  return {};
}

export async function deleteAsset(assetId: string): Promise<ActionResult> {
  await requireAdmin();

  const [tickets, tasks] = await Promise.all([
    db.ticket.count({ where: { assetId } }),
    db.maintenanceTask.count({ where: { assetId } }),
  ]);

  // Borrar el equipo dejaría huérfano su historial: mejor avisar y que lo dé de baja.
  if (tickets > 0 || tasks > 0) {
    const partes = [
      tickets > 0 ? `${tickets} ticket${tickets === 1 ? "" : "s"}` : null,
      tasks > 0 ? `${tasks} tarea${tasks === 1 ? "" : "s"} de mantenimiento` : null,
    ].filter(Boolean);
    return {
      error: `No se puede borrar: tiene ${partes.join(" y ")} asociados. Marcalo como "De baja".`,
    };
  }

  await db.asset.delete({ where: { id: assetId } });

  revalidateAssets(assetId);
  return {};
}

/** Vincula o desvincula un ticket de un equipo. */
export async function updateTicketAsset(ticketId: string, assetId: string | null): Promise<ActionResult> {
  await requireAdmin();

  await db.ticket.update({ where: { id: ticketId }, data: { assetId } });

  revalidatePath("/admin");
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/equipos");
  return {};
}
