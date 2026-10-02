"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import type { RecurrenceInput } from "@/lib/maintenance";
import {
  completeMaintenanceTaskSchema,
  createMaintenanceTaskSchema,
  updateMaintenanceTaskSchema,
} from "@/lib/validations";

export type ActionResult = { error?: string };

export type MaintenanceTaskInput = {
  title: string;
  description?: string;
} & RecurrenceInput;

/** Normaliza la regla: deja en null los campos que no aplican a la frecuencia elegida. */
function toRecurrenceData(data: RecurrenceInput) {
  const isMonthly = data.freq === "MONTH";
  const monthlyMode = isMonthly ? data.monthlyMode ?? "DAY_OF_MONTH" : null;
  const byNthWeekday = monthlyMode === "NTH_WEEKDAY";

  return {
    freq: data.freq,
    interval: Math.max(1, data.interval),
    timeOfDay: data.freq === "HOUR" ? null : data.timeOfDay ?? 0,
    weekdays:
      data.freq === "WEEK"
        ? [...new Set(data.weekdays)].sort((a, b) => a - b)
        : byNthWeekday
          ? [data.weekdays[0] ?? 1]
          : [],
    monthlyMode,
    monthDay:
      (isMonthly && !byNthWeekday) || data.freq === "YEAR" ? data.monthDay ?? 1 : null,
    nthWeek: byNthWeekday ? data.nthWeek ?? 1 : null,
    monthOfYear: data.freq === "YEAR" ? data.monthOfYear ?? 0 : null,
    endType: data.endType,
    endDate: data.endType === "ON_DATE" ? data.endDate : null,
    endCount: data.endType === "AFTER_COUNT" ? data.endCount : null,
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
      ...toRecurrenceData(parsed.data),
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
      ...toRecurrenceData(parsed.data),
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
