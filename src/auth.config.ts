import type { NextAuthConfig } from "next-auth";

// Shared by both auth.ts (full config, used in Server Actions/Components/the
// API route) and proxy.ts (route-protection only). This file must stay free
// of anything that touches Prisma — that separation is what keeps proxy.ts
// fast and avoids bundling the DB client into the proxy layer.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // Runs on every matched request. Returning false triggers Auth.js's
    // built-in redirect to `pages.signIn` — deliberately NOT returning a
    // custom NextResponse here, since redirecting directly from this
    // callback has open, version-dependent reliability issues upstream.
    // The plain boolean path is the well-tested default behavior.
    authorized({ auth, request }) {
      const role = auth?.user?.role;
      const { pathname } = request.nextUrl;

      const isAdminRoute = pathname.startsWith("/admin");
      const isTeacherRoute = pathname.startsWith("/teacher");

      if (isAdminRoute) return role === "ADMIN";
      if (isTeacherRoute) return role === "TEACHER";

      return true;
    },
  },
  providers: [], // the real Credentials provider (needs Prisma) lives only in auth.ts
} satisfies NextAuthConfig;
