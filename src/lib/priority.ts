import { PILL } from "./pills";
import type { TicketPriority } from "@prisma/client";

export const PRIORITY_META: Record<
  TicketPriority,
  { label: string; description: string; badgeClass: string; dot: string }
> = {
  LOW: {
    label: "Baja",
    description: "Puede esperar, no afecta el trabajo diario",
    badgeClass: PILL.success,
    dot: "bg-[#16A34A]",
  },
  MEDIUM: {
    label: "Media",
    description: "Conviene resolverlo pronto, pero no es urgente",
    badgeClass: PILL.warning,
    dot: "bg-[#F59E0B]",
  },
  HIGH: {
    label: "Alta",
    description: "Afecta el trabajo, hay que resolverlo hoy",
    badgeClass: PILL.high,
    dot: "bg-[#EA580C]",
  },
  URGENT: {
    label: "Urgente",
    description: "Necesito ayuda ya, está frenando la atención",
    badgeClass: PILL.danger,
    dot: "bg-[#DC2626]",
  },
};

export const PRIORITY_ORDER: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export const PRIORITY_RANK: Record<TicketPriority, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
};

export const STATUS_LABELS = {
  BACKLOG: "En Espera",
  IN_PROGRESS: "En Progreso",
  COMPLETED: "Completado",
} as const;

export const STATUS_DOT: Record<keyof typeof STATUS_LABELS, string> = {
  BACKLOG: "bg-[#94A3B8]",
  IN_PROGRESS: "bg-[#075573]",
  COMPLETED: "bg-[#16A34A]",
};

/** Fondo del selector de estado: gris esperando, azul en curso, verde cerrado. */
export const STATUS_CHIP: Record<keyof typeof STATUS_LABELS, string> = {
  BACKLOG: "bg-[#E2E8F0] text-[#334155] border-[#CBD5E1]",
  IN_PROGRESS: "bg-[#DBEAFE] text-[#075573] border-[#BFDBFE]",
  COMPLETED: "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]",
};

export const STATUS_PILL: Record<keyof typeof STATUS_LABELS, string> = {
  BACKLOG: PILL.neutral,
  IN_PROGRESS: PILL.brand,
  COMPLETED: PILL.success,
};
