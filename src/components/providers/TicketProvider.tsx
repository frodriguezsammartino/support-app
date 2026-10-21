"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { setTicketProvider } from "@/lib/actions/providers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ProviderOption = {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
};

/**
 * De qué proveedor depende el ticket, con su contacto a mano para llamarlo. Aparece
 * cuando el ticket está en "Depende de proveedor" (o ya tiene uno elegido).
 */
export function TicketProvider({
  ticketId,
  providerId,
  providers,
}: {
  ticketId: string;
  providerId: string | null;
  providers: ProviderOption[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(providerId ?? "");
  const [isPending, startTransition] = useTransition();
  const current = providers.find((p) => p.id === value);

  function change(next: string) {
    const previous = value;
    setValue(next);
    startTransition(async () => {
      const result = await setTicketProvider(ticketId, next);
      if (result.error) {
        toast.error(result.error);
        setValue(previous);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-slate-50 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink-muted">Depende del proveedor:</span>
        <Select value={value} onValueChange={(v) => change(v ?? "")} disabled={isPending}>
          <SelectTrigger size="sm" className="w-56">
            <SelectValue placeholder="Sin elegir">
              {(v: string) => providers.find((p) => p.id === v)?.name ?? "Sin elegir"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Sin elegir</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {current && (current.contactName || current.phone || current.email) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
          {current.contactName && <span>Contacto: {current.contactName}</span>}
          {current.phone && (
            <a href={`tel:${current.phone}`} className="inline-flex items-center gap-1 text-brand hover:underline">
              <Phone className="size-3.5" />
              {current.phone}
            </a>
          )}
          {current.email && (
            <a href={`mailto:${current.email}`} className="inline-flex items-center gap-1 text-brand hover:underline">
              <Mail className="size-3.5" />
              {current.email}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
