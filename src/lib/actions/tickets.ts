"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { sendTicketCompletedEmail } from "@/lib/email";
import {
  addCommentSchema,
  completeTicketSchema,
  createInternalTicketSchema,
  createTicketSchema,
} from "@/lib/validations";
import type { TicketPriority, TicketStatus } from "@prisma/client";

export type FormState = { error?: string } | undefined;

export async function createTicket(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = createTicketSchema.safeParse({
    reporterName: formData.get("reporterName"),
    reporterEmail: formData.get("reporterEmail"),
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos del formulario." };
  }

  await db.ticket.create({
    data: {
      ...parsed.data,
      description: parsed.data.description ?? "",
      statusHistory: {
        create: { toStatus: "BACKLOG" },
      },
    },
  });

  redirect("/ticket-cargado");
}

export async function addComment(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = addCommentSchema.safeParse({
    ticketId: formData.get("ticketId"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá la nota." };
  }

  await db.comment.create({
    data: {
      ticketId: parsed.data.ticketId,
      authorName: "Técnico",
      body: parsed.data.body,
      isFromAdmin: true,
    },
  });

  revalidatePath(`/admin/tickets/${parsed.data.ticketId}`);
}

export type ActionResult = { error?: string; code?: "MISSING_TRIAGE" };

/** Mueve un ticket entre Backlog <-> En Progreso (en cualquier sentido). Completar requiere `completeTicket`. */
export async function updateTicketStatus(
  ticketId: string,
  toStatus: "BACKLOG" | "IN_PROGRESS"
): Promise<ActionResult> {
  await requireAdmin();

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.status === "COMPLETED") return { error: "El ticket no se puede mover." };

  if (toStatus === "IN_PROGRESS" && (!ticket.categoryId || !ticket.priority)) {
    return { error: "Asigná categoría y urgencia antes de pasarlo a En Progreso.", code: "MISSING_TRIAGE" };
  }

  await db.ticket.update({
    where: { id: ticketId },
    data: {
      status: toStatus,
      startedAt: toStatus === "IN_PROGRESS" && !ticket.startedAt ? new Date() : ticket.startedAt,
      statusHistory: {
        create: { fromStatus: ticket.status as TicketStatus, toStatus },
      },
    },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/tickets/${ticketId}`);
  return {};
}

export async function updateTicketPriority(ticketId: string, priority: TicketPriority): Promise<ActionResult> {
  await requireAdmin();

  await db.ticket.update({ where: { id: ticketId }, data: { priority } });

  revalidatePath("/admin");
  revalidatePath(`/admin/tickets/${ticketId}`);
  return {};
}

export async function updateTicketCategory(ticketId: string, categoryId: string): Promise<ActionResult> {
  await requireAdmin();

  await db.ticket.update({ where: { id: ticketId }, data: { categoryId } });

  revalidatePath("/admin");
  revalidatePath(`/admin/tickets/${ticketId}`);
  return {};
}

export async function updateTicketTitle(ticketId: string, title: string): Promise<ActionResult> {
  await requireAdmin();

  const trimmed = title.trim();
  if (trimmed.length < 5) return { error: "El título es muy corto." };

  await db.ticket.update({ where: { id: ticketId }, data: { title: trimmed } });

  revalidatePath("/admin");
  revalidatePath(`/admin/tickets/${ticketId}`);
  return {};
}

export async function deleteTicket(ticketId: string): Promise<ActionResult> {
  await requireAdmin();

  await db.ticket.delete({ where: { id: ticketId } });

  revalidatePath("/admin");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/equipos");
  return {};
}

export async function completeTicket(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = completeTicketSchema.safeParse({
    ticketId: formData.get("ticketId"),
    resolutionNote: formData.get("resolutionNote"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Contá qué se hizo para resolverlo." };
  }

  const ticket = await db.ticket.findUnique({ where: { id: parsed.data.ticketId } });
  if (!ticket || ticket.status === "COMPLETED") {
    return { error: "El ticket ya está completado." };
  }

  await db.ticket.update({
    where: { id: parsed.data.ticketId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      startedAt: ticket.startedAt ?? new Date(),
      resolutionNote: parsed.data.resolutionNote,
      statusHistory: {
        create: { fromStatus: ticket.status, toStatus: "COMPLETED", note: parsed.data.resolutionNote },
      },
    },
  });

  if (ticket.reporterEmail) {
    await sendTicketCompletedEmail({
      to: ticket.reporterEmail,
      reporterName: ticket.reporterName,
      ticketNumber: ticket.number,
      ticketTitle: ticket.title,
      resolutionNote: parsed.data.resolutionNote,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/dashboard");
  revalidatePath(`/admin/tickets/${parsed.data.ticketId}`);
}

/** Asigna categoría + urgencia y mueve a En Progreso en un solo paso (usado cuando faltan esos datos). */
export async function triageAndStart(
  ticketId: string,
  categoryId: string,
  priority: TicketPriority
): Promise<ActionResult> {
  await requireAdmin();

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.status !== "BACKLOG") return { error: "El ticket ya no está en espera." };

  await db.ticket.update({
    where: { id: ticketId },
    data: {
      categoryId,
      priority,
      status: "IN_PROGRESS",
      startedAt: new Date(),
      statusHistory: { create: { fromStatus: "BACKLOG", toStatus: "IN_PROGRESS" } },
    },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/tickets/${ticketId}`);
  return {};
}

/** Reabre un ticket completado, devolviéndolo a Backlog o En Progreso. */
export async function reopenTicket(
  ticketId: string,
  toStatus: "BACKLOG" | "IN_PROGRESS"
): Promise<ActionResult> {
  await requireAdmin();

  const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.status !== "COMPLETED") return { error: "El ticket no está completado." };

  await db.ticket.update({
    where: { id: ticketId },
    data: {
      status: toStatus,
      completedAt: null,
      resolutionNote: null,
      statusHistory: { create: { fromStatus: "COMPLETED", toStatus, note: "Reabierto" } },
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/dashboard");
  revalidatePath(`/admin/tickets/${ticketId}`);
  return {};
}

/** El técnico carga una tarea para sí mismo, sin pasar por el formulario público. */
export async function createInternalTicket(input: {
  title: string;
  description?: string;
  categoryId: string;
  priority: TicketPriority;
  reporterName?: string;
  assetId?: string;
  createdAt?: Date | null;
}): Promise<ActionResult> {
  await requireAdmin();

  const parsed = createInternalTicketSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }

  // Permite fechar el ticket cuando realmente pasó, no cuando el técnico se acordó.
  const createdAt = parsed.data.createdAt ?? new Date();

  await db.ticket.create({
    data: {
      createdAt,
      reporterName: parsed.data.reporterName?.trim() || "Técnico",
      reporterEmail: null,
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      categoryId: parsed.data.categoryId,
      priority: parsed.data.priority,
      assetId: parsed.data.assetId || null,
      statusHistory: { create: { toStatus: "BACKLOG", changedAt: createdAt } },
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/equipos");
  return {};
}
