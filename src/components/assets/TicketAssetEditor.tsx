"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateTicketAsset } from "@/lib/actions/assets";
import { AssetPicker, NO_ASSET, type AssetOption } from "./AssetPicker";

export function TicketAssetEditor({
  ticketId,
  assetId,
  assets,
}: {
  ticketId: string;
  assetId: string | null;
  assets: AssetOption[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(assetId ?? NO_ASSET);
  const [isPending, startTransition] = useTransition();

  return (
    <div className={isPending ? "pointer-events-none opacity-60" : undefined}>
      <AssetPicker
        assets={assets}
        value={value}
        size="sm"
        className="w-64"
        onChange={(next) => {
          const previous = value;
          setValue(next);
          startTransition(async () => {
            const result = await updateTicketAsset(ticketId, next || null);
            if (result.error) {
              setValue(previous);
              toast.error(result.error);
              return;
            }
            router.refresh();
          });
        }}
      />
    </div>
  );
}
