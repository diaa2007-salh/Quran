import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// A plain pg.Pool (not just a bare connection string handed to PrismaPg)
// so attachDatabasePool can manage its lifecycle - Vercel's and Neon's
// own recommended pattern for Fluid Compute, where a function instance
// can be frozen and reused across requests. Without this, connections
// opened in a frozen instance can go stale, which surfaces as exactly
// the kind of "pg driver" errors this file was rewritten to fix. Guarded
// behind process.env.VERCEL so local dev and other hosts are unaffected.
const pool = new Pool({ connectionString });

if (process.env.VERCEL) {
  attachDatabasePool(pool);
}

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Re-exported so the rest of the app imports enums/model types from this
// one file instead of "@prisma/client" (wrong package in v7) or reaching
// into the generated folder directly from every call site.
export * from "../../generated/prisma/client";
