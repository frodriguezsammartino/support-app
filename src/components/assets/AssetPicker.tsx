"use client";

import { assetLabel } from "@/lib/assets";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AssetOption = { id: string; code: number; name: string; location: string | null };

/** "" = sin equipo. Base UI necesita un valor siempre definido. */
export const NO_ASSET = "";

export function AssetPicker({
  assets,
  value,
  onChange,
  size,
  className = "w-full",
}: {
  assets: AssetOption[];
  value: string;
  onChange: (assetId: string) => void;
  size?: "sm";
  className?: string;
}) {
  const labelOf = (id: string) => {
    if (!id) return "Sin equipo";
    const asset = assets.find((a) => a.id === id);
    return asset ? assetLabel(asset) : "Sin equipo";
  };

  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? NO_ASSET)}>
      <SelectTrigger size={size} className={className}>
        <SelectValue>{(v: string) => labelOf(v)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_ASSET}>Sin equipo</SelectItem>
        {assets.map((asset) => (
          <SelectItem key={asset.id} value={asset.id}>
            {assetLabel(asset)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
