"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { adminOnly, requireStaff } from "@/lib/adminAuth";
import { createLicenseSchema, updateLicenseSchema } from "@/lib/validations";
import type {
  LicenseBilling,
  LicenseKind,
  LicensePricing,
  LicenseStatus,
} from "@/lib/licenses";

export type ActionResult = { error?: string };

export type LicenseInput = {
  name: string;
  kind: LicenseKind;
  vendor?: string | null;
  seatsTotal: number;
  seatsAssigned: number;
  costCents?: number | null;
  currency: string;
  billing: LicenseBilling;
  pricing: LicensePricing;
  expiresAt?: Date | null;
  autoRenew: boolean;
  status: LicenseStatus;
  notes?: string | null;
  url?: string | null;
};

function revalidateLicenses() {
  revalidatePath("/admin/licencias");
  revalidatePath("/admin/dashboard");
}

/** Un servicio con un proveedor que todavía no está cargado lo suma a la lista de Proveedores. */
async function ensureProvider(kind: string, vendor?: string | null) {
  const name = vendor?.trim();
  if (!name || kind === "SOFTWARE") return;
  const existing = await db.provider.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (!existing) await db.provider.create({ data: { name } });
}

function toLicenseData(data: LicenseInput) {
  return {
    name: data.name,
    kind: data.kind,
    vendor: data.vendor || null,
    seatsTotal: data.seatsTotal,
    seatsAssigned: data.seatsAssigned,
    costCents: data.costCents ?? null,
    currency: data.currency,
    billing: data.billing,
    pricing: data.pricing,
    expiresAt: data.expiresAt ?? null,
    autoRenew: data.autoRenew,
    status: data.status,
    notes: data.notes || null,
    url: data.url || null,
  };
}

export async function createLicense(input: LicenseInput): Promise<ActionResult> {
  const role = await requireStaff();

  const parsed = createLicenseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }

  // El técnico carga lo que es y cómo se usa; el costo lo completa el administrador.
  const data = toLicenseData(parsed.data);
  if (role === "TECH") data.costCents = null;

  await db.license.create({ data });
  await ensureProvider(data.kind, data.vendor);

  revalidateLicenses();
  return {};
}

export async function updateLicense(licenseId: string, input: LicenseInput): Promise<ActionResult> {
  const role = await requireStaff();

  const parsed = updateLicenseSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }

  const data = toLicenseData(parsed.data);

  // El técnico no ve los costos, así que lo que manda no los incluye: se conservan
  // los que ya estaban en vez de pisarlos con vacío.
  if (role === "TECH") {
    const current = await db.license.findUnique({
      where: { id: licenseId },
      select: { costCents: true, currency: true, billing: true },
    });
    if (!current) return { error: "No se encontró la licencia." };
    data.costCents = current.costCents;
    data.currency = current.currency;
    data.billing = current.billing;
  }

  await db.license.update({ where: { id: licenseId }, data });
  await ensureProvider(data.kind, data.vendor);

  revalidateLicenses();
  return {};
}

/** Atajo para sumar o restar un puesto desde la tabla, sin abrir el formulario. */
export async function adjustAssignedSeats(licenseId: string, delta: number): Promise<ActionResult> {
  await requireStaff();

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
  const denied = await adminOnly();
  if (denied) return denied;

  await db.license.delete({ where: { id: licenseId } });

  revalidateLicenses();
  return {};
}
