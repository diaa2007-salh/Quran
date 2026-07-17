import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in environment variables");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting DB seeding...");

  const hashedPassword = await bcrypt.hash("Diaa2022", 10);

  const admin = await prisma.user.upsert({
    where: { username: "DiaaSalah" },
    update: {
      hashedPassword,
      isActive: true,
      role: Role.ADMIN,
    },
    create: {
      username: "DiaaSalah",
      fullName: "Diaa Salah",
      hashedPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  console.log("Admin user sync completed:", admin.username);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seeding error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });