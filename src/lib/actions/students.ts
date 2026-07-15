"use server";

import { requireTeacher } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

/** "أسماء التلاميذ" - the roster for the signed-in teacher's own group only. */
export async function getMyGroupStudents() {
  const teacher = await requireTeacher();

  const group = await prisma.group.findFirst({
    where: { teacherId: teacher.id },
  });

  const students = await prisma.student.findMany({
    where: { group: { teacherId: teacher.id }, isActive: true },
    orderBy: { fullName: "asc" },
  });

  return {
    groupName: group?.name ?? null,
    students: students.map((s) => ({
      id: s.id,
      fullName: s.fullName,
      guardianPhone: s.guardianPhone,
    })),
  };
}
