import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createSignedSessionToken,
  getSessionRole,
  type Role,
} from "./session";

export const TECH_NAME = process.env.TECH_NAME || "Alfonso Araujo";

export async function setAdminSessionCookie(role: Role = "ADMIN") {
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, createSignedSessionToken(role), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearAdminSessionCookie() {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
}

/** El rol de quien está logueado, o null si no hay sesión. */
export async function getRole(): Promise<Role | null> {
  const store = await cookies();
  return getSessionRole(store.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function isAdminAuthenticated() {
  return (await getRole()) !== null;
}

/** Cualquiera con sesión: administrador o técnico. Devuelve el rol. */
export async function requireStaff(): Promise<Role> {
  const role = await getRole();
  if (!role) redirect("/admin/login");
  return role;
}

/** Solo el administrador. Para páginas: redirige si no es admin. */
export async function requireAdmin() {
  const role = await requireStaff();
  if (role !== "ADMIN") redirect("/admin");
}

export const ADMIN_ONLY_ERROR = "Solo el administrador puede hacer esto.";

/**
 * Para server actions que solo puede hacer el admin (borrar, resolver solicitudes).
 * No redirige: devuelve el error para que el cliente lo muestre en un toast.
 */
export async function adminOnly(): Promise<{ error: string } | null> {
  const role = await requireStaff();
  return role === "ADMIN" ? null : { error: ADMIN_ONLY_ERROR };
}

/** Nombre para firmar lo que se carga: el técnico se identifica por su nombre. */
export function actorName(role: Role, fallback?: string | null) {
  return role === "TECH" ? TECH_NAME : fallback?.trim() || "Administrador";
}
