"use client";

import { useActionState, useState } from "react";
import { Lock, ShieldCheck, Wrench } from "lucide-react";
import { adminLogin } from "@/lib/actions/admin";
import type { Role } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MODES: { role: Role; label: string; title: string; hint: string; icon: typeof Wrench }[] = [
  {
    role: "TECH",
    label: "Ingreso Técnico",
    title: "Ingreso Técnico",
    hint: "Para cargar y seguir tickets, mantenimiento, licencias y equipos.",
    icon: Wrench,
  },
  {
    role: "ADMIN",
    label: "Ingreso Administrativo",
    title: "Ingreso Administrativo",
    hint: "Acceso completo: aprobar solicitudes, borrar y ver el dashboard.",
    icon: ShieldCheck,
  },
];

export default function AdminLoginPage() {
  const [state, action, pending] = useActionState(adminLogin, undefined);
  const [role, setRole] = useState<Role>("TECH");
  const mode = MODES.find((m) => m.role === role) ?? MODES[0];

  return (
    <main className="flex flex-1 items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand text-white">
            <Lock className="size-6" />
          </span>
          <CardTitle>{mode.title}</CardTitle>
          <p className="text-sm text-ink-muted">{mode.hint}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div role="tablist" aria-label="Tipo de ingreso" className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            {MODES.map((m) => {
              const Icon = m.icon;
              const selected = m.role === role;
              return (
                <button
                  key={m.role}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setRole(m.role)}
                  className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors sm:text-sm ${
                    selected ? "bg-white text-brand shadow-sm" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* key: al cambiar de ingreso se vacía la contraseña y vuelve el foco al campo. */}
          <form key={role} action={action} className="flex flex-col gap-4">
            <input type="hidden" name="role" value={role} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" required autoFocus />
            </div>
            {state?.error && <p className="text-sm text-[#991B1B]">{state.error}</p>}
            <Button type="submit" disabled={pending} className="bg-brand hover:bg-brand-hover">
              {pending ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
