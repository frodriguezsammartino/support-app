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

export const createMaintenanceTaskSchema = z.object({
  title: z.string().trim().min(3, "Contá brevemente la tarea").max(150),
  description: z.string().trim().optional(),
  intervalHours: z.coerce.number().int().min(1, "El intervalo debe ser de al menos 1 hora").max(8760),
});

export const updateMaintenanceTaskSchema = createMaintenanceTaskSchema;

export const completeMaintenanceTaskSchema = z.object({
  note: z.string().trim().optional(),
});
