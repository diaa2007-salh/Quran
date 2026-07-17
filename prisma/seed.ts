import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
// TypeScript in this environment may not have @types/node available.
// Declare `process` to avoid TS errors about missing node types.
declare const process: any;

// 🚀 نوفر رابط قاعدة البيانات عبر متغير البيئة قبل إنشاء العميل
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://neondb_owner:npg_ELZMTmS6v7PH@ep-calm-surf-aswin.tech/neondb?sslmode=require&channel_binding=require";
}
const prisma = new PrismaClient();

async function main() {
  console.log("Starting DB seeding...");

  const hashedPassword = await bcrypt.hash("Diaa2022", 10);

  const admin = await prisma.user.upsert({
    where: { username: "DiaaSalah" },
    update: {
      hashedPassword: hashedPassword,
      isActive: true,
      role: Role.ADMIN,
    },
    create: {
      username: "DiaaSalah",
      fullName: "Diaa Salah",
      hashedPassword: hashedPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  console.log("Admin user sync completed: " + admin.username);
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