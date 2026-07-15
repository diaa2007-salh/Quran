"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { AttendanceStatus } from "@/lib/prisma";
import { safeParseOrError } from "@/lib/actions/action-result";

async function verifyStudentInTeacherGroup(studentId: string, teacherId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { group: true },
  });
  if (!student || student.group?.teacherId !== teacherId) {
    return null;
  }
  return student;
}

function parseDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

const setAttendanceSchema = z.object({
  studentId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.nativeEnum(AttendanceStatus),
});

export type SetAttendanceInput = z.infer<typeof setAttendanceSchema>;

/**
 * Single toggle used by BOTH "التأخر اليومي" (Lateness) and "الغياب اليومي"
 * (Absence) - they are two screens over the same Attendance row. Upserts on
 * the [studentId, date] composite unique key from schema.prisma, so
 * clicking a status twice in a row just overwrites rather than duplicating.
 */
export async function setAttendanceStatus(input: SetAttendanceInput) {
  const teacher = await requireTeacher();
  const parsed = safeParseOrError(
    setAttendanceSchema,
    input,
    "تعذّر تحديث الحالة."
  );
  if (!parsed.success) return parsed;
  const { studentId, date, status } = parsed.data;

  const student = await verifyStudentInTeacherGroup(studentId, teacher.id);
  if (!student) {
    return {
      success: false as const,
      error: "هذا التلميذ ليس ضمن مجموعتك.",
    };
  }

  const dateOnly = parseDateOnly(date);

  await prisma.attendance.upsert({
    where: { studentId_date: { studentId, date: dateOnly } },
    create: { studentId, date: dateOnly, status, recordedById: teacher.id },
    update: { status, recordedById: teacher.id },
  });

  revalidatePath("/teacher/attendance");
  revalidatePath("/teacher/lateness");
  revalidatePath("/teacher");

  return { success: true as const };
}

/**
 * All of the signed-in teacher's active students for one day, defaulting
 * anyone without a saved row to PRESENT (matches "by default, all students
 * appear as Present" from the spec).
 */
export async function getTodayAttendanceForMyGroup(date: string) {
  const teacher = await requireTeacher();
  const dateOnly = parseDateOnly(date);

  const students = await prisma.student.findMany({
    where: { group: { teacherId: teacher.id }, isActive: true },
    orderBy: { fullName: "asc" },
    include: {
      attendances: { where: { date: dateOnly } },
    },
  });

  return students.map((student) => ({
    id: student.id,
    fullName: student.fullName,
    status: student.attendances?.[0]?.status ?? AttendanceStatus.PRESENT,
  }));
}

/** Quick stats for the teacher dashboard's "today's attendance rate" card. */
export async function getTodayAttendanceSummary(date: string) {
  const rows = await getTodayAttendanceForMyGroup(date);
  const total = rows.length;
  const present = rows.filter((r) => r.status === AttendanceStatus.PRESENT).length;
  const late = rows.filter((r) => r.status === AttendanceStatus.LATE).length;
  const absent = rows.filter((r) => r.status === AttendanceStatus.ABSENT).length;

  return {
    total,
    present,
    late,
    absent,
    presentRate: total === 0 ? 0 : Math.round((present / total) * 100),
  };
}
