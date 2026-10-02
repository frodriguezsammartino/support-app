export type AssetType =
  | "PC"
  | "NOTEBOOK"
  | "PRINTER"
  | "SERVER"
  | "NETWORK"
  | "UPS"
  | "PHONE"
  | "OTHER";

export type AssetStatus = "ACTIVE" | "REPAIR" | "RETIRED";

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  PC: "PC de escritorio",
  NOTEBOOK: "Notebook",
  PRINTER: "Impresora",
  SERVER: "Servidor",
  NETWORK: "Red (router, switch, AP)",
  UPS: "UPS",
  PHONE: "Teléfono",
  OTHER: "Otro",
};

/** Versión corta, para la columna de la tabla. */
export const ASSET_TYPE_SHORT: Record<AssetType, string> = {
  PC: "PC",
  NOTEBOOK: "Notebook",
  PRINTER: "Impresora",
  SERVER: "Servidor",
  NETWORK: "Red",
  UPS: "UPS",
  PHONE: "Teléfono",
  OTHER: "Otro",
};

export const ASSET_TYPE_ORDER: AssetType[] = [
  "PC",
  "NOTEBOOK",
  "PRINTER",
  "SERVER",
  "NETWORK",
  "UPS",
  "PHONE",
  "OTHER",
];

export const ASSET_STATUS_META: Record<
  AssetStatus,
  { label: string; badgeClass: string; rowClass: string }
> = {
  ACTIVE: {
    label: "En uso",
    badgeClass: "bg-[#0ca30c] text-white border-transparent",
    rowClass: "",
  },
  REPAIR: {
    label: "En reparación",
    badgeClass: "bg-[#fab219] text-black border-transparent",
    rowClass: "bg-amber-50/70 hover:bg-amber-50",
  },
  RETIRED: {
    label: "De baja",
    badgeClass: "bg-zinc-500 text-white border-transparent",
    rowClass: "opacity-60",
  },
};

export const ASSET_STATUS_ORDER: AssetStatus[] = ["ACTIVE", "REPAIR", "RETIRED"];

export type WarrantyState = "NONE" | "VALID" | "EXPIRING" | "EXPIRED";

/** Avisa 60 días antes: da tiempo a decidir si se repara por garantía o se cambia. */
export const WARRANTY_WARN_DAYS = 60;

export const WARRANTY_META: Record<WarrantyState, { label: string; className: string }> = {
  NONE: { label: "Sin dato", className: "text-zinc-400" },
  VALID: { label: "Vigente", className: "text-zinc-600" },
  EXPIRING: { label: "Por vencer", className: "text-amber-700 font-medium" },
  EXPIRED: { label: "Vencida", className: "text-zinc-500" },
};

export function getWarrantyState(warrantyUntil: Date | null): WarrantyState {
  if (!warrantyUntil) return "NONE";
  const remainingDays = (warrantyUntil.getTime() - Date.now()) / 86_400_000;
  if (remainingDays < 0) return "EXPIRED";
  if (remainingDays <= WARRANTY_WARN_DAYS) return "EXPIRING";
  return "VALID";
}

/** Etiqueta para elegir el equipo en un desplegable. */
export function assetLabel(asset: { code: number; name: string; location: string | null }) {
  return asset.location ? `#${asset.code} ${asset.name} — ${asset.location}` : `#${asset.code} ${asset.name}`;
}
