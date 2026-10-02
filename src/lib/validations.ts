import { z } from "zod";

export const createTicketSchema = z.object({
  reporterName: z.string().trim().min(2, "Ingresá tu nombre completo").max(120),
  reporterEmail: z.string().trim().email("Ingresá un email válido"),
  title: z.string().trim().min(5, "Contá brevemente el problema").max(150),
  description: z.string().trim().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
});

export const addCommentSchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().trim().min(2, "La nota no puede estar vacía").max(4000),
});

export const completeTicketSchema = z.object({
  ticketId: z.string().min(1),
  resolutionNote: z.string().trim().min(5, "Contá brevemente qué se hizo").max(4000),
});

export const adminLoginSchema = z.object({
  password: z.string().min(1, "Ingresá la contraseña"),
});

export const createInternalTicketSchema = z.object({
  title: z.string().trim().min(5, "Contá brevemente la tarea").max(150),
  description: z.string().trim().optional(),
  categoryId: z.string().min(1, "Elegí una categoría"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  reporterName: z.string().trim().max(120).optional(),
});

export const createMaintenanceTaskSchema = z
  .object({
    title: z.string().trim().min(3, "Contá brevemente la tarea").max(150),
    description: z.string().trim().optional(),
    scheduleType: z.enum(["INTERVAL", "DAILY", "WEEKLY", "MONTHLY_DAY", "MONTHLY_NTH_WEEKDAY"]),
    intervalHours: z.coerce
      .number()
      .int()
      .min(1, "El intervalo debe ser de al menos 1 hora")
      .max(8760),
    timeOfDay: z.coerce.number().int().min(0).max(1439).nullable().optional(),
    weekday: z.coerce.number().int().min(0).max(6).nullable().optional(),
    monthDay: z.coerce.number().int().min(1).max(31).nullable().optional(),
    nthWeek: z.coerce.number().int().min(1).max(5).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    const needsTime = value.scheduleType !== "INTERVAL";
    if (needsTime && value.timeOfDay == null) {
      ctx.addIssue({ code: "custom", message: "Elegí a qué hora", path: ["timeOfDay"] });
    }
    if (
      (value.scheduleType === "WEEKLY" || value.scheduleType === "MONTHLY_NTH_WEEKDAY") &&
      value.weekday == null
    ) {
      ctx.addIssue({ code: "custom", message: "Elegí el día de la semana", path: ["weekday"] });
    }
    if (value.scheduleType === "MONTHLY_DAY" && value.monthDay == null) {
      ctx.addIssue({ code: "custom", message: "Elegí el día del mes", path: ["monthDay"] });
    }
    if (value.scheduleType === "MONTHLY_NTH_WEEKDAY" && value.nthWeek == null) {
      ctx.addIssue({ code: "custom", message: "Elegí qué semana del mes", path: ["nthWeek"] });
    }
  });

export const updateMaintenanceTaskSchema = createMaintenanceTaskSchema;

export const completeMaintenanceTaskSchema = z.object({
  note: z.string().trim().optional(),
});
