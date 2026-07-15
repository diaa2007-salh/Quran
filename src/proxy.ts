import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Next.js 16 renamed middleware.ts -> proxy.ts (must export a function
// named `proxy`, or a default export - a leftover middleware.ts is
// silently ignored at build time with no warning, which would leave
// /admin and /teacher completely unprotected).
//
// This is the fast first layer: it only reads the JWT, no DB call, so it
// won't notice a freeze/role change until the token itself changes. The
// authoritative check is requireAdmin()/requireTeacher() in
// lib/auth-guard.ts, which re-reads the User row fresh on every Server
// Action - that's the layer "freeze account" actually depends on.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*"],
};
