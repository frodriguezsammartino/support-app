"use client";

import { useActionState, useState } from "react";
import { createTicket } from "@/lib/actions/tickets";
import { PRIORITY_ORDER, PRIORITY_META } from "@/lib/priority";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TicketPriority } from "@prisma/client";

const FIELD = "h-10 border-slate-300 focus-visible:ring-1 focus-visible:ring-brand focus-visible:border-brand";

export function TicketForm() {
  const [state, action, pending] = useActionState(createTicket, undefined);
  const [priority, setPriority] = useState<TicketPriority | "">("");

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="priority" value={priority} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reporterName">Tu nombre</Label>
          <Input id="reporterName" name="reporterName" className={FIELD} placeholder="Ej: Dr. Gómez" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reporterEmail">Tu email</Label>
          <Input
            id="reporterEmail"
            name="reporterEmail"
            type="email"
            className={FIELD}
            placeholder="tu@email.com"
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">¿Qué problema tenés?</Label>
        <Input
          id="title"
          name="title"
          className={FIELD}
          placeholder="Ej: Se rompió el intercomunicador de la guardia"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Contanos un poco más (opcional)</Label>
        <Textarea
          id="description"
          name="description"
          rows={5}
          className="border-slate-300 focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand"
          placeholder="Desde cuándo pasa, qué probaste, dónde ocurre, etc."
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>¿Qué tan urgente es?</Label>
        {/* Chips en vez de desplegable: las cuatro opciones entran y se comparan de un vistazo. */}
        <div className="grid gap-2 sm:grid-cols-2">
          {PRIORITY_ORDER.map((p) => {
            const selected = priority === p;
            return (
              <button
                key={p}
                type="button"
                aria-pressed={selected}
                onClick={() => setPriority(p)}
                className={`flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  selected
                    ? "border-brand bg-brand-tint"
                    : "border-slate-300 bg-white hover:border-brand-soft hover:bg-brand-tint/40"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-ink">
                  <span className={`size-2 rounded-full ${PRIORITY_META[p].dot}`} />
                  {PRIORITY_META[p].label}
                </span>
                <span className="text-xs leading-snug text-ink-muted">
                  {PRIORITY_META[p].description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {state?.error && <p className="text-sm text-[#991B1B]">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || !priority}
        className="h-11 rounded-lg bg-brand text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Enviando..." : "Cargar ticket"}
      </button>
    </form>
  );
}
