import "dotenv/config";
import { defineConfig } from "prisma/config";

// The Prisma CLI (generate, migrate, db push, studio) uses DIRECT_URL when
// it's set, falling back to DATABASE_URL if it isn't - matching Prisma's
// and Vercel's own official guide exactly. Schema commands need a direct
// connection: if DATABASE_URL points at a pooled/PgBouncer connection
// (transaction mode), migrations can fail with "prepared statement
// already exists" errors, since pooled connections don't preserve the
// session state migrations need. The running app (lib/prisma.ts) always
// uses DATABASE_URL - only the CLI reads DIRECT_URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
