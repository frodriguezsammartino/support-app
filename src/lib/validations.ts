import { z } from "zod";
import { normalizeUrl } from "./url";

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
  // Quién dice ser: cada ingreso se compara solo contra su propia contraseña.
  role: z.enum(["TECH", "ADMIN"]),
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
  os: optionalText(80),
  office: optionalText(80),
  purchasedAt: z.coerce.date().nullable().optional(),
  warrantyUntil: z.coerce.date().nullable().optional(),
  notes: optionalText(4000),
});

export const updateAssetSchema = createAssetSchema;

export const createLicenseSchema = z.object({
  name: z.string().trim().min(2, "Ponele un nombre").max(120),
  kind: z.enum(["SOFTWARE", "SERVICE", "SUPPORT", "OTHER"]),
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
  url: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((v, ctx) => {
      const normalized = normalizeUrl(v);
      if (normalized === undefined) {
        ctx.addIssue({ code: "custom", message: "El enlace no es válido. Ejemplo: https://portal.proveedor.com" });
        return z.NEVER;
      }
      return normalized;
    }),
});

export const updateLicenseSchema = createLicenseSchema;

export const retireRequestSchema = z.object({
  target: z.enum(["ASSET", "LICENSE", "TASK"]),
  id: z.string().min(1),
  reason: z.string().trim().min(3, "Contá en pocas palabras por qué hay que darlo de baja").max(1000),
});

const optionalId = z
  .string()
  .optional()
  .nullable()
  .transform((v) => v || null);

/**
 * Un pedido de mejora, cambio, reemplazo o compra. Pocas reglas a propósito: lo
 * único obligatorio es decir qué se necesita; el resto es opcional salvo donde no
 * tendría sentido sin eso (un reemplazo sin saber qué equipo, ni con qué piezas).
 */
export const spendRequestSchema = z
  .object({
    kind: z.enum(["UPGRADE", "CHANGE", "REPLACE", "PURCHASE"]),
    assetId: optionalId,
    ticketId: optionalId,
    component: z
      .string()
      .trim()
      .max(40)
      .optional()
      .nullable()
      .transform((v) => v || null),
    title: z.string().trim().min(3, "Contá qué hay que cambiar, mejorar o comprar").max(150),
    reason: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .nullable()
      .transform((v) => v ?? ""),
    items: z
      .array(
        z.object({
          text: z.string().trim().max(200),
          qty: z.coerce.number().int().min(1).max(9999).nullable().optional(),
        })
      )
      .max(30)
      .default([])
      .transform((list) => list.filter((item) => item.text.length > 0)),
    estimatedCostCents: z.coerce.number().int().min(0).nullable().optional(),
    currency: z.enum(["ARS", "USD"]),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "UPGRADE" && !value.assetId) {
      ctx.addIssue({ code: "custom", message: "Elegí el equipo que se va a mejorar", path: ["assetId"] });
    }
    if (value.kind === "REPLACE" && !value.assetId) {
      ctx.addIssue({ code: "custom", message: "Elegí qué equipo hay que reemplazar", path: ["assetId"] });
    }
    if (value.kind === "REPLACE" && value.items.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Cargá al menos un componente mínimo que tiene que tener el reemplazo",
        path: ["items"],
      });
    }
  });

/** Una pieza de una PC: qué es y qué tiene. */
export const assetComponentSchema = z.object({
  assetId: z.string().min(1),
  kind: z.string().trim().min(1, "Elegí qué pieza es").max(40),
  description: z.string().trim().min(1, "Contá qué tiene. Ejemplo: 8 GB DDR3").max(200),
});

export const resolveRequestSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  costCents: z.coerce.number().int().min(0).nullable().optional(),
  currency: z.enum(["ARS", "USD"]).optional(),
  note: optionalText(1000),
  createTicket: z.boolean().optional(),
});
