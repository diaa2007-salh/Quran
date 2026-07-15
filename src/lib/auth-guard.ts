import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Role, User } from "@/lib/prisma";

export class AuthGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthGuardError";
  }
}

// Re-reads the user from the DB on every call rather than trusting the JWT
// alone. The token only proves who signed in, not whether an Admin has
// frozen the account since it was issued - this is what makes "freeze
// account" take effect on the very next action instead of waiting out the
// session's lifetime.
async function requireRole(role: Role): Promise<User> {
  const session = await auth();
  const sessionUserId = session?.user?.id;

  if (!sessionUserId) {
    throw new AuthGuardError("You must be signed in.");
  }

  const user = await prisma.user.findUnique({ where: { id: sessionUserId } });

  if (!user || !user.isActive) {
    throw new AuthGuardError("This account is no longer active.");
  }

  if (user.role !== role) {
    throw new AuthGuardError(`This action requires the ${role} role.`);
  }

  return user;
}

export function requireAdmin(): Promise<User> {
  return requireRole("ADMIN");
}

export function requireTeacher(): Promise<User> {
  return requireRole("TEACHER");
}
