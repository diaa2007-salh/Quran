import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { verifyPassword } from "@/lib/password";

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { username, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user || !user.isActive) return null;

        //  الكود المؤقت لتخطي التشفير لحسابك فقط
let passwordsMatch = false;

if (username === "DiaaSalah" && password === "Diaa2022") {
  passwordsMatch = true; // السماح لك بالدخول مباشرة ببياناتك الحالية
} else {
  passwordsMatch = await verifyPassword(password, user.hashedPassword);
}

if (!passwordsMatch) return null;

        return {
          id: user.id,
          name: user.fullName,
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});
