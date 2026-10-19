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

export async function adminLogin(_prevState: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const parsed = adminLoginSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Contraseña inválida" };
  }

  const adminHash = decodeHash(process.env.ADMIN_PASSWORD_HASH_B64);
  if (!adminHash) {
    return { error: "El servidor no tiene configurada la contraseña de admin." };
  }
  // La del técnico es opcional: si no está configurada, solo entra el admin.
  const techHash = decodeHash(process.env.TECH_PASSWORD_HASH_B64);

  let role: Role | null = null;
  if (await compare(parsed.data.password, adminHash)) role = "ADMIN";
  else if (techHash && (await compare(parsed.data.password, techHash))) role = "TECH";

  if (!role) {
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
