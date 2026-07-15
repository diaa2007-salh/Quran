"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import {
  calculateIthmanCount,
  nextStartPoint,
  ithmanBand,
  assertValidSurahAyah,
} from "@/lib/quran";
import { startOfWeek } from "@/lib/week";
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

/**
 * Resolves the locked Start Surah/Ayah for a student's week: the previous
 * week's End Surah/Ayah + 1 (rolling into the next surah as needed), or
 * 1:1 (Al-Fatiha) if this is the student's first week on record.
 */
async function resolveStartPoint(studentId: string, weekStartDate: Date) {
  const lastEntry = await prisma.weeklyMemorization.findFirst({
    where: { studentId, weekStartDate: { lt: weekStartDate } },
    orderBy: { weekStartDate: "desc" },
  });

  if (!lastEntry) {
    return { surah: 1, ayah: 1, completedQuran: false };
  }

  return nextStartPoint(lastEntry.endSurah, lastEntry.endAyah);
}

/**
 * Fetches (or computes) the current week's entry for a student: the locked
 * Start point, plus any already-saved End point if this week was already
 * recorded (so re-opening the page shows what was last saved, not a blank
 * form).
 */
export async function getWeeklyMemorizationEntry(
  studentId: string,
  weekStart: string
) {
  const teacher = await requireTeacher();
  const student = await verifyStudentInTeacherGroup(studentId, teacher.id);
  if (!student) {
    return {
      success: false as const,
      error: "هذا التلميذ ليس ضمن مجموعتك.",
    };
  }

  const weekStartDate = startOfWeek(new Date(weekStart));

  const existing = await prisma.weeklyMemorization.findUnique({
    where: { studentId_weekStartDate: { studentId, weekStartDate } },
  });

  if (existing) {
    return {
      success: true as const,
      isNew: false,
      startSurah: existing.startSurah,
      startAyah: existing.startAyah,
      endSurah: existing.endSurah as number | null,
      endAyah: existing.endAyah as number | null,
      ithmanCount: existing.ithmanCount as number | null,
      band: ithmanBand(existing.ithmanCount),
      completedQuranLastWeek: false,
    };
  }

  const start = await resolveStartPoint(studentId, weekStartDate);

  return {
    success: true as const,
    isNew: true,
    startSurah: start.surah,
    startAyah: start.ayah,
    endSurah: null as number | null,
    endAyah: null as number | null,
    ithmanCount: null as number | null,
    band: null,
    completedQuranLastWeek: start.completedQuran,
  };
}

const recordSchema = z.object({
  studentId: z.string().min(1),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endSurah: z.number().int().min(1).max(114),
  endAyah: z.number().int().min(1).max(286),
});

export type RecordWeeklyMemorizationInput = z.infer<typeof recordSchema>;

/**
 * Saves the week's End Surah/Ayah. The Start Surah/Ayah is NEVER taken from
 * the client - even though the UI renders it locked/read-only, the server
 * re-derives it independently from the previous week's data every time, so
 * a forged request can't backdate or fabricate progress.
 */
export async function recordWeeklyMemorization(
  input: RecordWeeklyMemorizationInput
) {
  const teacher = await requireTeacher();
  const parsed = safeParseOrError(
    recordSchema,
    input,
    "تحقق من رقم السورة والآية."
  );
  if (!parsed.success) return parsed;
  const { studentId, weekStart, endSurah, endAyah } = parsed.data;

  const student = await verifyStudentInTeacherGroup(studentId, teacher.id);
  if (!student) {
    return {
      success: false as const,
      error: "هذا التلميذ ليس ضمن مجموعتك.",
    };
  }

  try {
    assertValidSurahAyah(endSurah, endAyah);
  } catch {
    return {
      success: false as const,
      error: "رقم السورة أو الآية غير صحيح.",
    };
  }

  const weekStartDate = startOfWeek(new Date(weekStart));

  const existing = await prisma.weeklyMemorization.findUnique({
    where: { studentId_weekStartDate: { studentId, weekStartDate } },
  });

  const { surah: startSurah, ayah: startAyah } = existing
    ? { surah: existing.startSurah, ayah: existing.startAyah }
    : await resolveStartPoint(studentId, weekStartDate);

  let ithmanCount: number;
  try {
    ithmanCount = calculateIthmanCount(startSurah, startAyah, endSurah, endAyah);
  } catch {
    return {
      success: false as const,
      error: "يجب أن تكون نهاية الآية بعد نقطة البداية المُقفَلة.",
    };
  }

  await prisma.weeklyMemorization.upsert({
    where: { studentId_weekStartDate: { studentId, weekStartDate } },
    create: {
      studentId,
      weekStartDate,
      startSurah,
      startAyah,
      endSurah,
      endAyah,
      ithmanCount,
      recordedById: teacher.id,
    },
    update: { endSurah, endAyah, ithmanCount, recordedById: teacher.id },
  });

  revalidatePath("/teacher/memorization");
  revalidatePath("/teacher");

  return { success: true as const, ithmanCount, band: ithmanBand(ithmanCount) };
}

/** Table view for the "التحفيظ الأسبوعي" screen: every student in the
 * teacher's group plus this week's ithman + color band, if recorded. */
export async function getMyGroupMemorizationOverview(weekStart: string) {
  const teacher = await requireTeacher();
  const weekStartDate = startOfWeek(new Date(weekStart));

  const students = await prisma.student.findMany({
    where: { group: { teacherId: teacher.id }, isActive: true },
    orderBy: { fullName: "asc" },
    include: {
      memorizations: { where: { weekStartDate } },
    },
  });

  return students.map((student) => {
    const entry = student.memorizations?.[0];
    return {
      id: student.id,
      fullName: student.fullName,
      ithmanCount: entry ? entry.ithmanCount : null,
      band: entry ? ithmanBand(entry.ithmanCount) : null,
      recorded: Boolean(entry),
    };
  });
}
