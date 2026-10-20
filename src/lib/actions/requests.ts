"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { actorName, adminOnly, requireStaff } from "@/lib/adminAuth";
import {
  resolveRequestSchema,
  retireRequestSchema,
  spendRequestSchema,
} from "@/lib/validations";
import {
  KIND_META,
  componentLabel,
  isSpendKind,
  parseItems,
  type RetireTarget,
  type SpendKind,
} from "@/lib/requests";
import { deleteAsset } from "./assets";
import { deleteMaintenanceTask } from "./maintenance";
import { createInternalTicket } from "./tickets";

export type ActionResult = { error?: string };

export type RetireRequestInput = { target: RetireTarget; id: string; reason: string };

export type SpendRequestInput = {
  kind: SpendKind;
  assetId?: string | null;
  /** El ticket de reparación desde el que se pide, si salió de uno. */
  ticketId?: string | null;
  component?: string | null;
  title: string;
  reason?: string | null;
  /** Componentes mínimos (reemplazo) o cosas a comprar: líneas de texto libre. */
  items?: { text: string; qty?: number | null }[];
  estimatedCostCents?: number | null;
  currency: string;
};

export type ResolveInput = {
  decision: "APPROVE" | "REJECT";
  costCents?: number | null;
  currency?: string;
  note?: string | null;
  /** Crear un ticket para que el técnico lo haga y quede el seguimiento. */
  createTicket?: boolean;
};

function revalidateRequests(extra: (string | null | undefined)[] = []) {
  const paths = [
    "/admin",
    "/admin/solicitudes",
    "/admin/equipos",
    "/admin/licencias",
    "/admin/mantenimiento",
    "/admin/dashboard",
    ...extra.filter((p): p is string => !!p),
  ];
  for (const path of paths) revalidatePath(path);
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

/**
 * Un pedido de mejora, cambio por rotura, reemplazo de equipo o compra. Todos van
 * por el mismo flujo: el técnico pide, el admin aprueba y, si hay costo, queda
 * como gasto.
 */
export async function createSpendRequest(input: SpendRequestInput): Promise<ActionResult> {
  const role = await requireStaff();

  const parsed = spendRequestSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  const data = parsed.data;

  let targetLabel = "Sin equipo asociado";
  if (data.assetId) {
    const asset = await db.asset.findUnique({ where: { id: data.assetId }, select: { name: true } });
    if (!asset) return { error: "No se encontró el equipo." };
    targetLabel = asset.name;
  }

  if (data.ticketId) {
    const ticket = await db.ticket.findUnique({ where: { id: data.ticketId }, select: { id: true } });
    if (!ticket) return { error: "No se encontró el ticket." };
  }

  await db.request.create({
    data: {
      kind: data.kind,
      assetId: data.assetId,
      ticketId: data.ticketId,
      targetLabel,
      title: data.title,
      component: data.component,
      reason: data.reason,
      items: data.items.length > 0 ? data.items.map((i) => ({ text: i.text, qty: i.qty ?? null })) : undefined,
      estimatedCostCents: data.estimatedCostCents ?? null,
      currency: data.currency,
      requestedBy: actorName(role),
    },
  });

  revalidateRequests([
    data.assetId ? `/admin/equipos/${data.assetId}` : null,
    data.ticketId ? `/admin/tickets/${data.ticketId}` : null,
  ]);
  return {};
}

/**
 * Solo el admin resuelve. Aprobar una baja la ejecuta (con la consecuencia propia
 * de cada tipo); aprobar un pedido registra el gasto. Rechazar no toca nada.
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
    revalidateRequests([request.ticketId ? `/admin/tickets/${request.ticketId}` : null]);
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

  // Mejora, cambio, reemplazo o compra: se registra el costo y, si se pidió, se crea
  // el ticket de seguimiento. Si el pedido ya salió de un ticket no hace falta otro.
  if (
    createTicket &&
    isSpendKind(request.kind) &&
    request.kind !== "PURCHASE" &&
    request.assetId &&
    !request.ticketId
  ) {
    const category =
      (await db.category.findFirst({ where: { name: "Hardware", active: true } })) ??
      (await db.category.findFirst({ where: { active: true }, orderBy: { name: "asc" } }));
    if (category) {
      const piece = componentLabel(request.component);
      const lines = parseItems(request.items).map((i) => `- ${i.text}${i.qty ? ` x${i.qty}` : ""}`);
      const ticket = await createInternalTicket({
        title: request.title,
        description: [
          `${KIND_META[request.kind].label} aprobado (solicitud #${request.number})${piece ? `: ${piece}` : ""}.`,
          request.reason,
          lines.length > 0 ? lines.join("\n") : "",
        ]
          .filter(Boolean)
          .join("\n"),
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

  revalidateRequests([request.ticketId ? `/admin/tickets/${request.ticketId}` : null]);
  return {};
}
