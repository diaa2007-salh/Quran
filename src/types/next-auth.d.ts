import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/prisma";

declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      role: Role;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: Role;
  }
}

// Belt-and-suspenders: on some 5.0.0-beta releases the session callback's
// `token` param resolves through @auth/core/jwt directly rather than
// through next-auth/jwt's re-export, so the augmentation above alone
// doesn't always merge. Verified empirically against the installed
// next-auth 5.0.0-beta.31 - both declarations are needed.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: Role;
  }
}
