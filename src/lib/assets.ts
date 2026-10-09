import { PILL, ROW_TINT, STATE_TEXT } from "./pills";

export type AssetType =
  | "PC"
  | "NOTEBOOK"
  | "PRINTER"
  | "SERVER"
  | "NETWORK"
  | "UPS"
  | "PHONE"
  | "OTHER";

export type AssetStatus = "ACTIVE" | "STOCK" | "REPAIR";

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
  ACTIVE: { label: "En uso", badgeClass: PILL.success, rowClass: "" },
  STOCK: { label: "En inventario", badgeClass: PILL.neutral, rowClass: "" },
  REPAIR: { label: "En reparación", badgeClass: PILL.warning, rowClass: ROW_TINT.warning },
};

export const ASSET_STATUS_ORDER: AssetStatus[] = ["ACTIVE", "STOCK", "REPAIR"];

export type WarrantyState = "NONE" | "VALID" | "EXPIRING" | "EXPIRED";

/** Avisa 60 días antes: da tiempo a decidir si se repara por garantía o se cambia. */
export const WARRANTY_WARN_DAYS = 60;

export const WARRANTY_META: Record<WarrantyState, { label: string; className: string }> = {
  NONE: { label: "Sin dato", className: "text-ink-muted/70" },
  VALID: { label: "Vigente", className: "text-ink-muted" },
  EXPIRING: { label: "Por vencer", className: STATE_TEXT.warning },
  EXPIRED: { label: "Vencida", className: STATE_TEXT.muted },
};

export function getWarrantyState(warrantyUntil: Date | null): WarrantyState {
  if (!warrantyUntil) return "NONE";
  const remainingDays = (warrantyUntil.getTime() - Date.now()) / 86_400_000;
  if (remainingDays < 0) return "EXPIRED";
  if (remainingDays <= WARRANTY_WARN_DAYS) return "EXPIRING";
  return "VALID";
}

/** Solo los equipos personales tienen una persona a cargo. */
export function hasOwner(type: AssetType) {
  return type === "PC" || type === "NOTEBOOK";
}

/** Etiqueta para elegir el equipo en un desplegable. */
export function assetLabel(asset: { code: number; name: string; location: string | null }) {
  return asset.location ? `#${asset.code} ${asset.name} — ${asset.location}` : `#${asset.code} ${asset.name}`;
}
