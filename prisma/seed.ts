import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("⏳ بدء عملية حقن البيانات (Seeding)...");

  // 1. تنظيف البيانات القديمة المتعارضة
  await prisma.user.deleteMany({ where: { username: "DiaaSalah" } });

  // 2. تشفير كلمة المرور مباشرة بـ bcrypt
  const hashedPassword = await bcrypt.hash("Diaa2022", 10);

  // 3. إنشاء حساب المدير الأساسي
  const admin = await prisma.user.create({
    data: {
      username: "DiaaSalah",
      fullName: "Diaa Salah",
      hashedPassword: hashedPassword,
      role: Role.ADMIN, 
      isActive: true,
    },
  });

  console.log(`✅ تم إنشاء حساب المدير بنجاح: ${admin.username}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ حدث خطأ أثناء الـ Seeding:", e);
    await prisma.$disconnect();
    void (globalThis as any).process?.exit(1);
  });