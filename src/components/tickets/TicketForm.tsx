"use client";

import { useActionState } from "react";
import { createTicket } from "@/lib/actions/tickets";
import { PRIORITY_ORDER, PRIORITY_META } from "@/lib/priority";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TicketForm() {
  const [state, action, pending] = useActionState(createTicket, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="reporterName">Tu nombre</Label>
          <Input id="reporterName" name="reporterName" placeholder="Ej: Dr. Gómez" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="reporterEmail">Tu email</Label>
          <Input
            id="reporterEmail"
            name="reporterEmail"
            type="email"
            placeholder="tu@email.com"
            required
          />
          <p className="text-xs text-zinc-500">Te avisamos por acá cuando quede resuelto.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">¿Qué problema tenés?</Label>
        <Input id="title" name="title" placeholder="Ej: Se rompió el intercomunicador de la guardia" required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Contanos un poco más (opcional)</Label>
        <Textarea
          id="description"
          name="description"
          rows={5}
          placeholder="Desde cuándo pasa, qué probaste, dónde ocurre, etc."
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>¿Qué tan urgente es?</Label>
        <Select name="priority" required>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Elegí una opción">
              {(value: string) => PRIORITY_META[value as keyof typeof PRIORITY_META]?.label ?? "Elegí una opción"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_ORDER.map((p) => (
              <SelectItem key={p} value={p}>
                <div className="flex flex-col py-0.5">
                  <span className="flex items-center gap-1.5">
                    <span className={`size-2 rounded-full ${PRIORITY_META[p].dot}`} />
                    {PRIORITY_META[p].label}
                  </span>
                  <span className="text-xs text-muted-foreground">{PRIORITY_META[p].description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" disabled={pending} size="lg" className="bg-blue-600 hover:bg-blue-700">
        {pending ? "Enviando..." : "Cargar ticket"}
      </Button>
    </form>
  );
}
