"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { actorName, adminOnly, requireStaff } from "@/lib/adminAuth";
import {
  resolveRequestSchema,
  retireRequestSchema,
  upgradeRequestSchema,
} from "@/lib/validations";
import { componentLabel, type RetireTarget } from "@/lib/requests";
import { deleteAsset } from "./assets";
import { deleteMaintenanceTask } from "./maintenance";
import { createInternalTicket } from "./tickets";

export type ActionResult = { error?: string };

export type RetireRequestInput = { target: RetireTarget; id: string; reason: string };

export type UpgradeRequestInput = {
  assetId: string;
  component: string;
  title: string;
  reason: string;
  estimatedCostCents?: number | null;
  currency: string;
};

export type ResolveInput = {
  decision: "APPROVE" | "REJECT";
  costCents?: number | null;
  currency?: string;
  note?: string | null;
  /** Para mejoras: crear un ticket para que el técnico la haga y quede el seguimiento. */
  createTicket?: boolean;
};

function revalidateRequests() {
  for (const path of [
    "/admin",
    "/admin/solicitudes",
    "/admin/equipos",
    "/admin/licencias",
    "/admin/mantenimiento",
    "/admin/dashboard",
  ]) {
    revalidatePath(path);
  }
}

/** Nombre del objeto al momento de pedir, o null si ya no existe. */
async function targetLabelOf(target: RetireTarget, id: string): Promise<string | null> {
  if (target === "ASSET") return (await db.asset.findUnique({ where: { id }, select: { name: true } }))?.name ?? null;
  if (target === "LICENSE") return (await db.license.findUnique({ where: { id }, select: { name: true } }))?.name ?? null;
  return (await db.maintenanceTask.findUnique({ where: { id }, select: { title: true } }))?.title ?? null;
}

export async function createRetireRequest(input: RetireRequestInput): Promise<ActionResult> {
  const role = await requireStaff();

  const parsed = retireRequestSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  const { target, id, reason } = parsed.data;

  const label = await targetLabelOf(target, id);
  if (!label) return { error: "No se encontró lo que querés dar de baja." };

  const link =
    target === "ASSET" ? { assetId: id } : target === "LICENSE" ? { licenseId: id } : { taskId: id };

  // Una sola pendiente por objeto: si no, el admin vería lo mismo repetido.
  const already = await db.request.count({ where: { kind: "RETIRE", status: "PENDING", ...link } });
  if (already > 0) return { error: "Ya hay una solicitud de baja pendiente para esto." };

  await db.request.create({
    data: {
      kind: "RETIRE",
      ...link,
      targetLabel: label,
      title: `Baja de ${label}`,
      reason,
      requestedBy: actorName(role),
    },
  });

  revalidateRequests();
  return {};
}

export async function createUpgradeRequest(input: UpgradeRequestInput): Promise<ActionResult> {
  const role = await requireStaff();

  const parsed = upgradeRequestSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  const data = parsed.data;

  const asset = await db.asset.findUnique({ where: { id: data.assetId }, select: { name: true } });
  if (!asset) return { error: "No se encontró el equipo." };

  await db.request.create({
    data: {
      kind: "UPGRADE",
      assetId: data.assetId,
      targetLabel: asset.name,
      title: data.title,
      component: data.component,
      reason: data.reason,
      estimatedCostCents: data.estimatedCostCents ?? null,
      currency: data.currency,
      requestedBy: actorName(role),
    },
  });

  revalidateRequests();
  return {};
}

/**
 * Solo el admin resuelve. Aprobar una baja la ejecuta (con la consecuencia propia
 * de cada tipo); aprobar una mejora registra el gasto. Rechazar no toca nada.
 */
export async function resolveRequest(requestId: string, input: ResolveInput): Promise<ActionResult> {
  const denied = await adminOnly();
  if (denied) return denied;

  const parsed = resolveRequestSchema.safeParse({ id: requestId, ...input });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  const { decision, costCents, currency, note, createTicket } = parsed.data;

  const request = await db.request.findUnique({ where: { id: requestId } });
  if (!request) return { error: "No se encontró la solicitud." };
  if (request.status !== "PENDING") return { error: "Esta solicitud ya fue resuelta." };

  if (decision === "REJECT") {
    await db.request.update({
      where: { id: requestId },
      data: { status: "REJECTED", decidedAt: new Date(), decisionNote: note },
    });
    revalidateRequests();
    return {};
  }

  if (request.kind === "RETIRE") {
    // Si el objeto ya no existe (se borró a mano), alcanza con cerrar la solicitud.
    let outcome: ActionResult = {};
    if (request.assetId) outcome = await deleteAsset(request.assetId, true);
    else if (request.taskId) outcome = await deleteMaintenanceTask(request.taskId);
    else if (request.licenseId) {
      await db.license.update({ where: { id: request.licenseId }, data: { status: "CANCELLED" } });
    }
    if (outcome.error) return outcome;

    await db.request.update({
      where: { id: requestId },
      data: { status: "APPROVED", decidedAt: new Date(), decisionNote: note },
    });
    revalidateRequests();
    return {};
  }

  // UPGRADE: se registra el costo y, si se pidió, se crea el ticket de seguimiento.
  if (createTicket && request.assetId) {
    const category =
      (await db.category.findFirst({ where: { name: "Hardware", active: true } })) ??
      (await db.category.findFirst({ where: { active: true }, orderBy: { name: "asc" } }));
    if (category) {
      const label = componentLabel(request.component);
      const ticket = await createInternalTicket({
        title: request.title,
        description: `Mejora aprobada (solicitud #${request.number})${label ? `: ${label}` : ""}. ${request.reason}`,
        categoryId: category.id,
        priority: "MEDIUM",
        assetId: request.assetId,
        reporterName: request.requestedBy,
      });
      if (ticket.error) return { error: `No se pudo crear el ticket: ${ticket.error}` };
    }
  }

  await db.request.update({
    where: { id: requestId },
    data: {
      status: "APPROVED",
      decidedAt: new Date(),
      decisionNote: note,
      costCents: costCents ?? null,
      currency: currency ?? request.currency,
    },
  });

  revalidateRequests();
  return {};
}
