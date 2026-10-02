"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import {
  completeMaintenanceTaskSchema,
  createMaintenanceTaskSchema,
  updateMaintenanceTaskSchema,
} from "@/lib/validations";

export type ActionResult = { error?: string };

export async function createMaintenanceTask(input: {
  title: string;
  description?: string;
  intervalHours: number;
}): Promise<ActionResult> {
  await requireAdmin();

  const parsed = createMaintenanceTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }

  await db.maintenanceTask.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      intervalHours: parsed.data.intervalHours,
    },
  });

  revalidatePath("/admin/mantenimiento", "layout");
  return {};
}

export async function updateMaintenanceTask(
  taskId: string,
  input: { title: string; description?: string; intervalHours: number }
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = updateMaintenanceTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }

  await db.maintenanceTask.update({
    where: { id: taskId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      intervalHours: parsed.data.intervalHours,
    },
  });

  revalidatePath("/admin/mantenimiento", "layout");
  return {};
}

export async function completeMaintenanceTask(taskId: string, note?: string): Promise<ActionResult> {
  await requireAdmin();

  const parsed = completeMaintenanceTaskSchema.safeParse({ note });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá la nota." };
  }

  const now = new Date();
  await db.maintenanceTask.update({
    where: { id: taskId },
    data: {
      lastCompletedAt: now,
      completions: { create: { note: parsed.data.note || null, completedAt: now } },
    },
  });

  revalidatePath("/admin/mantenimiento", "layout");
  return {};
}

export async function toggleMaintenanceTaskActive(taskId: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();

  await db.maintenanceTask.update({ where: { id: taskId }, data: { active } });

  revalidatePath("/admin/mantenimiento", "layout");
  return {};
}

export async function deleteMaintenanceTask(taskId: string): Promise<ActionResult> {
  await requireAdmin();

  await db.maintenanceTask.delete({ where: { id: taskId } });

  revalidatePath("/admin/mantenimiento", "layout");
  return {};
}
