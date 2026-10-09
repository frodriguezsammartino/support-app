import { z } from "zod";

export const createTicketSchema = z.object({
  reporterName: z.string().trim().min(2, "Ingresá tu nombre completo").max(120),
  reporterEmail: z.string().trim().email("Ingresá un email válido"),
  title: z.string().trim().min(3, "El problema tiene que tener al menos 3 letras").max(150),
  description: z.string().trim().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
});

export const addCommentSchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().trim().min(2, "La nota no puede estar vacía").max(4000),
});

export const completeTicketSchema = z.object({
  ticketId: z.string().min(1),
  resolutionNote: z.string().trim().min(3, "Contá en pocas palabras qué se hizo").max(4000),
});

export const adminLoginSchema = z.object({
  password: z.string().min(1, "Ingresá la contraseña"),
});

export const createInternalTicketSchema = z.object({
  assetId: z.string().optional(),
  // Permite cargar algo que pasó antes, pero no fechar un ticket en el futuro.
  createdAt: z.coerce
    .date()
    .max(new Date(Date.now() + 60_000), "La fecha no puede ser futura")
    .nullable()
    .optional(),
  title: z.string().trim().min(3, "El título tiene que tener al menos 3 letras").max(150),
  description: z.string().trim().optional(),
  categoryId: z.string().min(1, "Elegí una categoría"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  reporterName: z.string().trim().max(120).optional(),
});

export const createMaintenanceTaskSchema = z
  .object({
    title: z.string().trim().min(3, "El título tiene que tener al menos 3 letras").max(150),
    description: z.string().trim().optional(),
    assetId: z.string().optional(),
    freq: z.enum(["HOUR", "DAY", "WEEK", "MONTH", "YEAR"]),
    interval: z.coerce.number().int().min(1, "Tiene que repetirse al menos cada 1").max(999),
    timeOfDay: z.coerce.number().int().min(0).max(1439).nullable().optional(),
    weekdays: z.array(z.coerce.number().int().min(0).max(6)).default([]),
    monthlyMode: z.enum(["DAY_OF_MONTH", "NTH_WEEKDAY"]).nullable().optional(),
    monthDay: z.coerce.number().int().min(1).max(31).nullable().optional(),
    nthWeek: z.coerce.number().int().min(1).max(5).nullable().optional(),
    monthOfYear: z.coerce.number().int().min(0).max(11).nullable().optional(),
    endType: z.enum(["NEVER", "ON_DATE", "AFTER_COUNT"]),
    endDate: z.coerce.date().nullable().optional(),
    endCount: z.coerce.number().int().min(1).max(999).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.freq === "WEEK" && value.weekdays.length === 0) {
      ctx.addIssue({ code: "custom", message: "Elegí al menos un día de la semana", path: ["weekdays"] });
    }
    if (value.freq !== "HOUR" && value.timeOfDay == null) {
      ctx.addIssue({ code: "custom", message: "Elegí a qué hora", path: ["timeOfDay"] });
    }
    if (value.endType === "ON_DATE" && value.endDate == null) {
      ctx.addIssue({ code: "custom", message: "Elegí hasta qué día se repite", path: ["endDate"] });
    }
    if (value.endType === "AFTER_COUNT" && value.endCount == null) {
      ctx.addIssue({ code: "custom", message: "Elegí cuántas repeticiones", path: ["endCount"] });
    }
  });

export const updateMaintenanceTaskSchema = createMaintenanceTaskSchema;

export const completeMaintenanceTaskSchema = z.object({
  note: z.string().trim().optional(),
});

export const maintenanceNoteSchema = z.object({
  note: z.string().trim().min(2, "La nota no puede estar vacía").max(4000),
  at: z.coerce
    .date()
    .max(new Date(Date.now() + 60_000), "La fecha no puede ser futura")
    .nullable()
    .optional(),
});

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => v || null);

export const createAssetSchema = z.object({
  name: z.string().trim().min(2, "Ponele un nombre al equipo").max(120),
  type: z.enum(["PC", "NOTEBOOK", "PRINTER", "SERVER", "NETWORK", "UPS", "PHONE", "OTHER"]),
  status: z.enum(["ACTIVE", "STOCK", "REPAIR"]),
  brand: optionalText(80),
  model: optionalText(80),
  serialNumber: optionalText(120),
  location: optionalText(120),
  owner: optionalText(120),
  purchasedAt: z.coerce.date().nullable().optional(),
  warrantyUntil: z.coerce.date().nullable().optional(),
  notes: optionalText(4000),
});

export const updateAssetSchema = createAssetSchema;

export const createLicenseSchema = z.object({
  name: z.string().trim().min(2, "Ponele un nombre a la licencia").max(120),
  vendor: optionalText(80),
  seatsTotal: z.coerce.number().int().min(1, "Tiene que haber al menos 1 puesto").max(10000),
  // Se permite asignar mas puestos de los comprados: justamente eso hay que poder verlo.
  seatsAssigned: z.coerce.number().int().min(0, "No puede ser negativo").max(10000),
  costCents: z.coerce.number().int().min(0).nullable().optional(),
  currency: z.enum(["ARS", "USD"]),
  billing: z.enum(["MONTHLY", "YEARLY", "ONE_TIME"]),
  pricing: z.enum(["PER_SEAT", "FLAT", "UNLIMITED"]),
  expiresAt: z.coerce.date().nullable().optional(),
  autoRenew: z.coerce.boolean(),
  status: z.enum(["ACTIVE", "CANCELLED"]),
  notes: optionalText(4000),
});

export const updateLicenseSchema = createLicenseSchema;
