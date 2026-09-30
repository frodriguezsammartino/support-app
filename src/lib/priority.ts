import type { TicketPriority } from "@prisma/client";

export const PRIORITY_META: Record<
  TicketPriority,
  { label: string; description: string; badgeClass: string; dot: string }
> = {
  LOW: {
    label: "Baja",
    description: "Puede esperar, no afecta el trabajo diario",
    badgeClass: "bg-[#0ca30c] text-white border-transparent",
    dot: "bg-[#0ca30c]",
  },
  MEDIUM: {
    label: "Media",
    description: "Conviene resolverlo pronto, pero no es urgente",
    badgeClass: "bg-[#fab219] text-black border-transparent",
    dot: "bg-[#fab219]",
  },
  HIGH: {
    label: "Alta",
    description: "Afecta el trabajo, hay que resolverlo hoy",
    badgeClass: "bg-[#ec835a] text-black border-transparent",
    dot: "bg-[#ec835a]",
  },
  URGENT: {
    label: "Urgente",
    description: "Necesito ayuda ya, está frenando la atención",
    badgeClass: "bg-[#d03b3b] text-white border-transparent",
    dot: "bg-[#d03b3b]",
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
  BACKLOG: "bg-zinc-400",
  IN_PROGRESS: "bg-blue-600",
  COMPLETED: "bg-zinc-900",
};
