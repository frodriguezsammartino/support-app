/**
 * Estilos de los badges de estado. Son los mismos cuatro tonos en toda la app
 * (tickets, mantenimiento, equipos y licencias) para que un color signifique
 * siempre lo mismo, sin importar la pantalla.
 */
export const PILL = {
  /** Alta, vencida, urgente: requiere accion. */
  danger: "bg-[#FEE2E2] text-[#991B1B] border-transparent",
  /** Lo mas critico dentro de danger, un paso mas fuerte. */
  dangerStrong: "bg-[#FECACA] text-[#7F1D1D] border-transparent",
  /** Media, por vencer, en reparacion. */
  warning: "bg-[#FEF3C7] text-[#92400E] border-transparent",
  /** Baja, al dia, activa, completado. */
  success: "bg-[#DCFCE7] text-[#166534] border-transparent",
  /** En espera, pausada, dada de baja: estado neutro. */
  neutral: "bg-[#E2E8F0] text-[#334155] border-transparent",
  /** En curso: usa el azul institucional en su version suave. */
  brand: "bg-brand-tint text-brand border-transparent",
} as const;

/** Tintes de fila, muy suaves, para resaltar sin gritar. */
export const ROW_TINT = {
  danger: "bg-[#FEE2E2]/40 hover:bg-[#FEE2E2]/60",
  warning: "bg-[#FEF3C7]/40 hover:bg-[#FEF3C7]/60",
  brand: "bg-brand-tint/60 hover:bg-brand-tint",
  muted: "opacity-60",
} as const;

/** Color del texto cuando el estado se muestra como texto y no como pill. */
export const STATE_TEXT = {
  danger: "text-[#991B1B] font-medium",
  warning: "text-[#92400E] font-medium",
  success: "text-[#166534] font-medium",
  muted: "text-ink-muted",
} as const;
