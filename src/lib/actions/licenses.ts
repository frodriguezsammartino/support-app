"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { createLicenseSchema, updateLicenseSchema } from "@/lib/validations";
import type { LicenseBilling, LicenseStatus } from "@/lib/licenses";

export type ActionResult = { error?: string };

export type LicenseInput = {
  name: string;
  vendor?: string | null;
  seatsTotal: number;
  seatsAssigned: number;
  costCents?: number | null;
  currency: string;
  billing: LicenseBilling;
  expiresAt?: Date | null;
  autoRenew: boolean;
  status: LicenseStatus;
  notes?: string | null;
};

function revalidateLicenses() {
  revalidatePath("/admin/licencias");
  revalidatePath("/admin/dashboard");
}

function toLicenseData(data: LicenseInput) {
  return {
    name: data.name,
    vendor: data.vendor || null,
    seatsTotal: data.seatsTotal,
    seatsAssigned: data.seatsAssigned,
    costCents: data.costCents ?? null,
    currency: data.currency,
    billing: data.billing,
    expiresAt: data.expiresAt ?? null,
    autoRenew: data.autoRenew,
    status: data.status,
    notes: data.notes || null,
  };
}

export async function createLicense(input: LicenseInput): Promise<ActionResult> {
  await requireAdmin();

  const parsed = createLicenseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }

  await db.license.create({ data: toLicenseData(parsed.data) });

  revalidateLicenses();
  return {};
}

export async function updateLicense(licenseId: string, input: LicenseInput): Promise<ActionResult> {
  await requireAdmin();

  const parsed = updateLicenseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }

  await db.license.update({ where: { id: licenseId }, data: toLicenseData(parsed.data) });

  revalidateLicenses();
  return {};
}

/** Atajo para sumar o restar un puesto desde la tabla, sin abrir el formulario. */
export async function adjustAssignedSeats(licenseId: string, delta: number): Promise<ActionResult> {
  await requireAdmin();

  const license = await db.license.findUnique({
    where: { id: licenseId },
    select: { seatsAssigned: true },
  });
  if (!license) return { error: "No se encontró la licencia." };

  const next = license.seatsAssigned + delta;
  if (next < 0) return { error: "No puede haber menos de 0 puestos asignados." };

  await db.license.update({ where: { id: licenseId }, data: { seatsAssigned: next } });

  revalidateLicenses();
  return {};
}

export async function deleteLicense(licenseId: string): Promise<ActionResult> {
  await requireAdmin();

  await db.license.delete({ where: { id: licenseId } });

  revalidateLicenses();
  return {};
}
