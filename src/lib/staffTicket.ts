import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { actorName } from "@/lib/adminAuth";
import type { Role } from "@/lib/session";
import { createInternalTicketSchema } from "@/lib/validations";
import type { TicketPriority } from "@prisma/client";

export type StaffTicketInput = {
  title: string;
  description?: string;
  categoryId?: string;
  newCategoryName?: string;
  providerId?: string;
  priority: TicketPriority;
  assetId?: string;
  createdAt?: Date | null;
};

/** Crea el ticket a nombre de `reporterName`. Lo usan la app y las solicitudes aprobadas. */
export async function createStaffTicket(
  role: Role,
  input: StaffTicketInput,
  reporterName: string
): Promise<{ error?: string }> {
  const parsed = createInternalTicketSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }
  const data = parsed.data;

  // La categoría: una existente o una nueva ("Otro"), que queda para la próxima vez.
  let category: { id: string; askProvider: boolean } | null = null;
  const newName = data.newCategoryName?.trim();
  if (newName) {
    if (newName.length < 2) return { error: "El nombre de la categoría tiene que tener al menos 2 letras." };
    const existing = await db.category.findFirst({
      where: { name: { equals: newName, mode: "insensitive" } },
    });
    category = existing
      ? { id: existing.id, askProvider: existing.askProvider }
      : await db.category.create({ data: { name: newName }, select: { id: true, askProvider: true } });
    if (existing && !existing.active) await db.category.update({ where: { id: existing.id }, data: { active: true } });
  } else if (data.categoryId) {
    category = await db.category.findUnique({
      where: { id: data.categoryId },
      select: { id: true, askProvider: true },
    });
    if (!category) return { error: "No se encontró la categoría." };
  } else {
    return { error: "Elegí una categoría" };
  }

  let provider: { id: string; name: string } | null = null;
  if (category.askProvider) {
    if (!data.providerId) return { error: "Elegí el proveedor" };
    provider = await db.provider.findUnique({
      where: { id: data.providerId },
      select: { id: true, name: true },
    });
    if (!provider) return { error: "No se encontró el proveedor." };
  }

  // Permite fechar el ticket cuando realmente pasó, no cuando el técnico se acordó.
  const createdAt = data.createdAt ?? new Date();

  await db.ticket.create({
    data: {
      createdAt,
      reporterName,
      reporterEmail: null,
      title: data.title,
      description: data.description ?? "",
      categoryId: category.id,
      priority: data.priority,
      assetId: data.assetId || null,
      // Un problema con un proveedor nace en "Depende de proveedor".
      status: provider ? "WAITING_PROVIDER" : "BACKLOG",
      statusHistory: {
        create: [
          { toStatus: "BACKLOG", changedAt: createdAt },
          ...(provider ? [{ fromStatus: "BACKLOG" as const, toStatus: "WAITING_PROVIDER" as const }] : []),
        ],
      },
      ...(provider && {
        providerId: provider.id,
        startedAt: new Date(),
        comments: {
          create: { authorName: actorName(role), isFromAdmin: true, body: `Proveedor: ${provider.name}.` },
        },
      }),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/equipos");
  if (provider) revalidatePath("/admin/licencias");
  return {};
}
