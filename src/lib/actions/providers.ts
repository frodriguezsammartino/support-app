"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { actorName, adminOnly, requireStaff } from "@/lib/adminAuth";
import {
  escalateTicketSchema,
  providerSchema,
  updateEscalationSchema,
} from "@/lib/validations";
import { ESCALATION_META, type EscalationStatus } from "@/lib/escalation";

export type ActionResult = { error?: string };

export type ProviderInput = {
  name: string;
  covers?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
};

function revalidateProviders(ticketId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/licencias");
  revalidatePath("/admin/dashboard");
  if (ticketId) revalidatePath(`/admin/tickets/${ticketId}`);
}

/** Cada cambio del escalamiento deja una nota en el ticket, para que quede el historial. */
async function leaveNote(ticketId: string, role: Parameters<typeof actorName>[0], body: string) {
  await db.comment.create({
    data: { ticketId, authorName: actorName(role), body, isFromAdmin: true },
  });
}

// ------------------------------------------------------------------ proveedores

export async function createProvider(input: ProviderInput): Promise<ActionResult> {
  await requireStaff();

  const parsed = providerSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };

  if (await db.provider.findUnique({ where: { name: parsed.data.name } })) {
    return { error: "Ya hay un proveedor con ese nombre." };
  }

  await db.provider.create({ data: parsed.data });

  revalidateProviders();
  return {};
}

export async function updateProvider(providerId: string, input: ProviderInput): Promise<ActionResult> {
  await requireStaff();

  const parsed = providerSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };

  const clash = await db.provider.findUnique({ where: { name: parsed.data.name } });
  if (clash && clash.id !== providerId) return { error: "Ya hay un proveedor con ese nombre." };

  await db.provider.update({ where: { id: providerId }, data: parsed.data });

  revalidateProviders();
  return {};
}

/**
 * Borrar un proveedor es borrar: solo el administrador. Si todavía tiene tickets
 * escalados sin resolver no se puede, porque quedarían esperando a nadie.
 */
export async function deleteProvider(providerId: string): Promise<ActionResult> {
  const denied = await adminOnly();
  if (denied) return denied;

  const open = await db.ticket.count({
    where: { providerId, escalationStatus: { in: ["WAITING", "IN_PROGRESS"] } },
  });
  if (open > 0) {
    return {
      error: `Tiene ${open} ticket${open === 1 ? "" : "s"} escalado${open === 1 ? "" : "s"} sin resolver. Resolvelos o pasalos a otro proveedor primero.`,
    };
  }

  await db.$transaction([
    // Los ya resueltos pierden la etiqueta; la historia queda en las notas de cada ticket.
    db.ticket.updateMany({
      where: { providerId },
      data: { escalationStatus: null, escalationContact: null, escalationRef: null, escalatedAt: null },
    }),
    db.provider.delete({ where: { id: providerId } }),
  ]);

  revalidateProviders();
  return {};
}

// ------------------------------------------------------------------ escalamiento

export type EscalateInput = { ticketId: string; providerId: string; contact?: string | null; ref?: string | null };

export async function escalateTicket(input: EscalateInput): Promise<ActionResult> {
  const role = await requireStaff();

  const parsed = escalateTicketSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  const { ticketId, providerId, contact, ref } = parsed.data;

  const ticket = await db.ticket.findUnique({ where: { id: ticketId }, select: { status: true } });
  if (!ticket) return { error: "No se encontró el ticket." };
  if (ticket.status === "COMPLETED") return { error: "El ticket ya está resuelto." };

  const provider = await db.provider.findUnique({ where: { id: providerId } });
  if (!provider) return { error: "No se encontró el proveedor." };

  // El contacto arranca con el del proveedor, pero se puede cambiar para este caso.
  const who = contact ?? provider.contactName ?? null;

  await db.ticket.update({
    where: { id: ticketId },
    data: {
      providerId,
      escalationStatus: "WAITING",
      escalationContact: who,
      escalationRef: ref,
      escalatedAt: new Date(),
    },
  });

  await leaveNote(
    ticketId,
    role,
    `Escalado a ${provider.name}${who ? ` (contacto: ${who})` : ""}${ref ? `. Reclamo ${ref}` : ""}. Estado: ${ESCALATION_META.WAITING.label.toLowerCase()}.`
  );

  revalidateProviders(ticketId);
  return {};
}

export type UpdateEscalationInput = {
  status?: EscalationStatus;
  contact?: string | null;
  ref?: string | null;
};

export async function updateEscalation(ticketId: string, input: UpdateEscalationInput): Promise<ActionResult> {
  const role = await requireStaff();

  const parsed = updateEscalationSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    select: { providerId: true, escalationStatus: true, escalationContact: true, escalationRef: true, provider: { select: { name: true } } },
  });
  if (!ticket || !ticket.providerId || !ticket.provider) return { error: "Este ticket no está escalado." };

  const { status, contact, ref } = parsed.data;
  const data: {
    escalationStatus?: EscalationStatus;
    escalationContact?: string | null;
    escalationRef?: string | null;
  } = {};
  if (status) data.escalationStatus = status;
  if (contact !== undefined) data.escalationContact = contact?.trim() || null;
  if (ref !== undefined) data.escalationRef = ref?.trim() || null;
  if (Object.keys(data).length === 0) return {};

  await db.ticket.update({ where: { id: ticketId }, data });

  if (status && status !== ticket.escalationStatus) {
    await leaveNote(ticketId, role, `Escalamiento a ${ticket.provider.name}: ${ESCALATION_META[status].label.toLowerCase()}.`);
  } else if (contact !== undefined || ref !== undefined) {
    await leaveNote(ticketId, role, `Se actualizó el contacto o el número de reclamo del escalamiento a ${ticket.provider.name}.`);
  }

  revalidateProviders(ticketId);
  return {};
}

/** Sacar el escalamiento: por ejemplo, si se escaló al proveedor equivocado. */
export async function clearEscalation(ticketId: string): Promise<ActionResult> {
  const role = await requireStaff();

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    select: { providerId: true, provider: { select: { name: true } } },
  });
  if (!ticket || !ticket.providerId) return { error: "Este ticket no está escalado." };

  await db.ticket.update({
    where: { id: ticketId },
    data: {
      providerId: null,
      escalationStatus: null,
      escalationContact: null,
      escalationRef: null,
      escalatedAt: null,
    },
  });

  await leaveNote(ticketId, role, `Se quitó el escalamiento a ${ticket.provider?.name ?? "el proveedor"}.`);

  revalidateProviders(ticketId);
  return {};
}
