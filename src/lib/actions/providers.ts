"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { actorName, adminOnly, requireStaff } from "@/lib/adminAuth";
import {
  providerSchema,
} from "@/lib/validations";

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
 * Borrar un proveedor es borrar: solo el administrador. Si todavía hay tickets
 * esperando a ese proveedor no se puede, porque quedarían esperando a nadie.
 */
export async function deleteProvider(providerId: string): Promise<ActionResult> {
  const denied = await adminOnly();
  if (denied) return denied;

  const open = await db.ticket.count({ where: { providerId, status: "WAITING_PROVIDER" } });
  if (open > 0) {
    return {
      error: `Hay ${open} ticket${open === 1 ? "" : "s"} que depende${open === 1 ? "" : "n"} de este proveedor. Resolvelos o cambiales el proveedor primero.`,
    };
  }

  // Los tickets ya cerrados pierden la etiqueta; el proveedor no se borra de su historia.
  await db.$transaction([
    db.ticket.updateMany({ where: { providerId }, data: { providerId: null } }),
    db.provider.delete({ where: { id: providerId } }),
  ]);

  revalidateProviders();
  return {};
}

// ------------------------------------------------------------------ proveedor de un ticket

/** De qué proveedor depende el ticket. "" lo deja sin proveedor. Deja una nota para que quede la historia. */
export async function setTicketProvider(ticketId: string, providerId: string): Promise<ActionResult> {
  const role = await requireStaff();

  const ticket = await db.ticket.findUnique({
    where: { id: ticketId },
    select: { providerId: true, status: true, provider: { select: { name: true } } },
  });
  if (!ticket) return { error: "No se encontró el ticket." };
  if (ticket.status === "COMPLETED") return { error: "El ticket ya está resuelto." };
  if ((ticket.providerId ?? "") === providerId) return {};

  let name: string | null = null;
  if (providerId) {
    const provider = await db.provider.findUnique({ where: { id: providerId }, select: { name: true } });
    if (!provider) return { error: "No se encontró el proveedor." };
    name = provider.name;
  }

  await db.ticket.update({ where: { id: ticketId }, data: { providerId: providerId || null } });
  await leaveNote(
    ticketId,
    role,
    name ? `Proveedor: ${name}.` : `Se quitó el proveedor (${ticket.provider?.name ?? "sin nombre"}).`
  );

  revalidateProviders(ticketId);
  return {};
}
