import { createHmac, timingSafeEqual } from "crypto";

export type Role = "ADMIN" | "TECH";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 días

// El valor firmado es lo que identifica el rol. "admin" es el valor histórico:
// las cookies emitidas antes de existir el técnico siguen entrando como admin.
const ROLE_VALUES: Record<Role, string> = { ADMIN: "admin", TECH: "tech" };

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Falta ADMIN_SESSION_SECRET en las variables de entorno");
  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function createSignedSessionToken(role: Role = "ADMIN") {
  const value = ROLE_VALUES[role];
  return `${value}.${sign(value)}`;
}

/** El rol de una cookie de sesión, o null si falta o la firma no coincide. */
export function getSessionRole(token: string | undefined | null): Role | null {
  if (!token) return null;
  const [value, signature] = token.split(".");
  if (!value || !signature) return null;

  const role = (Object.keys(ROLE_VALUES) as Role[]).find((r) => ROLE_VALUES[r] === value);
  if (!role) return null;

  const a = Buffer.from(signature);
  const b = Buffer.from(sign(value));
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? role : null;
}

export function isValidSessionToken(token: string | undefined | null) {
  return getSessionRole(token) !== null;
}
