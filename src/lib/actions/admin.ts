"use server";

import { compare } from "bcryptjs";
import { redirect } from "next/navigation";
import { adminLoginSchema } from "@/lib/validations";
import { clearAdminSessionCookie, setAdminSessionCookie } from "@/lib/adminAuth";
import type { Role } from "@/lib/session";

export type AdminLoginState = { error?: string } | undefined;

function decodeHash(b64: string | undefined) {
  return b64 ? Buffer.from(b64, "base64").toString("utf8") : null;
}

const HASH_ENV: Record<Role, string | undefined> = {
  get ADMIN() {
    return process.env.ADMIN_PASSWORD_HASH_B64;
  },
  get TECH() {
    return process.env.TECH_PASSWORD_HASH_B64;
  },
};

const NOT_CONFIGURED: Record<Role, string> = {
  ADMIN: "El servidor no tiene configurada la contraseña del ingreso administrativo.",
  TECH: "El servidor no tiene configurada la contraseña del ingreso técnico.",
};

/**
 * Hay dos ingresos, cada uno con su contraseña. La contraseña se compara solo
 * contra la del ingreso elegido: la del técnico no abre el ingreso administrativo
 * ni al revés, aunque alguien se equivoque de pestaña.
 */
export async function adminLogin(_prevState: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const parsed = adminLoginSchema.safeParse({
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Contraseña inválida" };
  }

  const { role, password } = parsed.data;
  const hash = decodeHash(HASH_ENV[role]);
  if (!hash) {
    return { error: NOT_CONFIGURED[role] };
  }

  if (!(await compare(password, hash))) {
    return { error: "Contraseña incorrecta." };
  }

  await setAdminSessionCookie(role);
  redirect("/admin");
}

export async function adminLogout() {
  "use server";
  await clearAdminSessionCookie();
  redirect("/");
}
