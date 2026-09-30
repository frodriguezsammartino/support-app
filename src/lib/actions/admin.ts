"use server";

import { compare } from "bcryptjs";
import { redirect } from "next/navigation";
import { adminLoginSchema } from "@/lib/validations";
import { clearAdminSessionCookie, setAdminSessionCookie } from "@/lib/adminAuth";

export type AdminLoginState = { error?: string } | undefined;

export async function adminLogin(_prevState: AdminLoginState, formData: FormData): Promise<AdminLoginState> {
  const parsed = adminLoginSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Contraseña inválida" };
  }

  const hashB64 = process.env.ADMIN_PASSWORD_HASH_B64;
  if (!hashB64) {
    return { error: "El servidor no tiene configurada la contraseña de admin." };
  }
  const hash = Buffer.from(hashB64, "base64").toString("utf8");

  const isValid = await compare(parsed.data.password, hash);
  if (!isValid) {
    return { error: "Contraseña incorrecta." };
  }

  await setAdminSessionCookie();
  redirect("/admin");
}

export async function adminLogout() {
  "use server";
  await clearAdminSessionCookie();
  redirect("/");
}
