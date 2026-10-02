"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { nominalIntervalHours, type ScheduleType } from "@/lib/maintenance";
import {
  completeMaintenanceTaskSchema,
  createMaintenanceTaskSchema,
  updateMaintenanceTaskSchema,
} from "@/lib/validations";

export type ActionResult = { error?: string };

export type MaintenanceTaskInput = {
  title: string;
  description?: string;
  scheduleType: ScheduleType;
  intervalHours: number;
  timeOfDay?: number | null;
  weekday?: number | null;
  monthDay?: number | null;
  nthWeek?: number | null;
};

/** Normaliza la agenda: deja en null los campos que no aplican al tipo elegido. */
function toScheduleData(data: MaintenanceTaskInput) {
  const type = data.scheduleType;
  const isCalendar = type !== "INTERVAL";
  return {
    scheduleType: type,
    intervalHours: nominalIntervalHours(type, data.intervalHours),
    timeOfDay: isCalendar ? data.timeOfDay ?? 0 : null,
    weekday: type === "WEEKLY" || type === "MONTHLY_NTH_WEEKDAY" ? data.weekday ?? 1 : null,
    monthDay: type === "MONTHLY_DAY" ? data.monthDay ?? 1 : null,
    nthWeek: type === "MONTHLY_NTH_WEEKDAY" ? data.nthWeek ?? 1 : null,
  };
}

function revalidateMaintenance(taskId?: string) {
  revalidatePath("/admin/mantenimiento");
  if (taskId) revalidatePath(`/admin/mantenimiento/${taskId}`);
  revalidatePath("/admin/dashboard");
}

export async function createMaintenanceTask(input: MaintenanceTaskInput): Promise<ActionResult> {
  await requireAdmin();

  const parsed = createMaintenanceTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }

  await db.maintenanceTask.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      ...toScheduleData(parsed.data),
    },
  });

  revalidateMaintenance();
  return {};
}

export async function updateMaintenanceTask(
  taskId: string,
  input: MaintenanceTaskInput
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
      ...toScheduleData(parsed.data),
    },
  });

  revalidateMaintenance(taskId);
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

  revalidateMaintenance(taskId);
  return {};
}

export async function deleteMaintenanceTask(taskId: string): Promise<ActionResult> {
  await requireAdmin();

  await db.maintenanceTask.delete({ where: { id: taskId } });

  revalidateMaintenance(taskId);
  return {};
}
