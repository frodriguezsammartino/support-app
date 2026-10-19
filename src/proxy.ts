import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, getSessionRole } from "./lib/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const role = getSessionRole(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (!role) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // El técnico no ve el dashboard: ocultar la pestaña no alcanza, se bloquea la ruta.
  if (role === "TECH" && (pathname === "/admin/dashboard" || pathname.startsWith("/admin/dashboard/"))) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
