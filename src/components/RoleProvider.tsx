"use client";

import { createContext, useContext } from "react";
import type { Role } from "@/lib/session";

const RoleContext = createContext<Role>("ADMIN");

/**
 * El rol llega del servidor (que es quien lo verifica). En el cliente solo sirve
 * para esconder lo que no corresponde: la defensa real está en cada server action.
 */
export function RoleProvider({ role, children }: { role: Role; children: React.ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

export function useRole(): Role {
  return useContext(RoleContext);
}

export function useIsAdmin(): boolean {
  return useContext(RoleContext) === "ADMIN";
}
