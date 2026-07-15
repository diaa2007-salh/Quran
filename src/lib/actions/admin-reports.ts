"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { AttendanceStatus } from "@/lib/prisma";
import { startOfWeek, todayDateString } from "@/lib/week";

function parseDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

// ---------------------------------------------------------------------------
// Cross-group attendance log ("تأخرات جميع التلاميذ" / "غيابات جميع التلاميذ")
// ---------------------------------------------------------------------------

const attendanceFilterSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  status: z.nativeEnum(AttendanceStatus).optional(),
  groupId: z.string().optional(),
});

export type AttendanceFilterInput = z.infer<typeof attendanceFilterSchema>;

export interface StudentAttendanceRow {
  studentId: string;
  studentName: string;
  groupName: string | null;
  teacherName: string | null;
  status: AttendanceStatus;
}

/**
 * Every active student's attendance for one day, across ALL halaqat -
 * unlike attendance.ts's teacher-facing reads, this one is deliberately
 * NOT scoped to a single group. `status` filters client-side of the query
 * boundary (after defaulting unset rows to PRESENT, same convention as the
 * teacher screens) so "no record yet" still reads as Present here too.
 */
export async function getAllStudentsAttendance(
  input: AttendanceFilterInput
): Promise<StudentAttendanceRow[]> {
  await requireAdmin();
  const { date, status, groupId } = attendanceFilterSchema.parse(input);
  const dateOnly = parseDateOnly(date);

  const students = await prisma.student.findMany({
    where: {
      isActive: true,
      ...(groupId ? { groupId } : {}),
    },
    orderBy: { fullName: "asc" },
    include: {
      group: { include: { teacher: true } },
      attendances: { where: { date: dateOnly } },
    },
  });

  const rows: StudentAttendanceRow[] = students.map((s) => ({
    studentId: s.id,
    studentName: s.fullName,
    groupName: s.group?.name ?? null,
    teacherName: s.group?.teacher?.fullName ?? null,
    status: s.attendances?.[0]?.status ?? AttendanceStatus.PRESENT,
  }));

  return status ? rows.filter((r) => r.status === status) : rows;
}

// ---------------------------------------------------------------------------
// Teacher monitoring board ("لوحة حالة مراقبة الأساتذة")
// ---------------------------------------------------------------------------

export type MonitoringStatus = "on_track" | "partial" | "behind" | "no_students";

export interface TeacherMonitoringRow {
  teacherId: string;
  teacherName: string;
  isActive: boolean;
  groupNames: string[];
  studentCount: number;
  /** How many of this teacher's students have TODAY's attendance recorded. */
  attendanceLoggedCount: number;
  /** How many of this teacher's students have THIS WEEK's memorization recorded. */
  memorizationLoggedCount: number;
  status: MonitoringStatus;
}

/**
 * "Tracking consistency" is defined here as: for every active student this
 * teacher is responsible for, is there (a) an Attendance row for today and
 * (b) a WeeklyMemorization row for the current week? A teacher with no
 * students yet isn't "behind" - there's nothing for them to have logged.
 * `status` bands: no_students (nothing assigned), behind (logged nothing
 * at all for anyone), partial (logged something but not everyone/both),
 * on_track (both fully logged for every student).
 */
export async function getTeacherMonitoringBoard(): Promise<
  TeacherMonitoringRow[]
> {
  await requireAdmin();

  const dateOnly = parseDateOnly(todayDateString());
  const weekStartDate = startOfWeek(new Date());

  const teachers = await prisma.user.findMany({
    where: { role: "TEACHER" },
    orderBy: { fullName: "asc" },
    include: {
      groups: {
        include: {
          students: {
            where: { isActive: true },
            include: {
              attendances: { where: { date: dateOnly } },
              memorizations: { where: { weekStartDate } },
            },
          },
        },
      },
    },
  });

  return teachers.map((teacher): TeacherMonitoringRow => {
    const groups = teacher.groups ?? [];
    const students = groups.flatMap((g) => g.students ?? []);
    const studentCount = students.length;
    const attendanceLoggedCount = students.filter(
      (s) => (s.attendances?.length ?? 0) > 0
    ).length;
    const memorizationLoggedCount = students.filter(
      (s) => (s.memorizations?.length ?? 0) > 0
    ).length;

    let status: MonitoringStatus;
    if (studentCount === 0) {
      status = "no_students";
    } else if (attendanceLoggedCount === 0 && memorizationLoggedCount === 0) {
      status = "behind";
    } else if (
      attendanceLoggedCount < studentCount ||
      memorizationLoggedCount < studentCount
    ) {
      status = "partial";
    } else {
      status = "on_track";
    }

    return {
      teacherId: teacher.id,
      teacherName: teacher.fullName,
      isActive: teacher.isActive,
      groupNames: groups.map((g) => g.name),
      studentCount,
      attendanceLoggedCount,
      memorizationLoggedCount,
      status,
    };
  });
}

// ---------------------------------------------------------------------------
// Reports & export ("تقارير") - date-range history, not just "today"
// ---------------------------------------------------------------------------

const reportFilterSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  groupId: z.string().optional(),
});

export type ReportFilterInput = z.infer<typeof reportFilterSchema>;

export interface AttendanceReportRow {
  studentName: string;
  groupName: string | null;
  date: string;
  status: AttendanceStatus;
}

/** Attendance history across a date range (not just today), for printing
 * or CSV export. Unlike getAllStudentsAttendance, this only returns rows
 * that actually exist - a day/student with no Attendance record isn't
 * defaulted to PRESENT here, since a report is a record of what was
 * logged, not a live "who's here right now" view. */
export async function getAttendanceReport(
  input: ReportFilterInput
): Promise<AttendanceReportRow[]> {
  await requireAdmin();
  const { startDate, endDate, groupId } = reportFilterSchema.parse(input);

  const records = await prisma.attendance.findMany({
    where: {
      date: { gte: parseDateOnly(startDate), lte: parseDateOnly(endDate) },
      student: {
        isActive: true,
        ...(groupId ? { groupId } : {}),
      },
    },
    orderBy: { date: "asc" },
    include: { student: { include: { group: true } } },
  });

  return records.map((r) => ({
    studentName: r.student?.fullName ?? "",
    groupName: r.student?.group?.name ?? null,
    date: r.date.toISOString().slice(0, 10),
    status: r.status,
  }));
}

export interface MemorizationReportRow {
  studentName: string;
  groupName: string | null;
  weekStartDate: string;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
  ithmanCount: number;
}

/** Weekly memorization badges across a date range, for printing or CSV
 * export - same "only what was actually logged" convention as the
 * attendance report above. */
export async function getMemorizationReport(
  input: ReportFilterInput
): Promise<MemorizationReportRow[]> {
  await requireAdmin();
  const { startDate, endDate, groupId } = reportFilterSchema.parse(input);

  const records = await prisma.weeklyMemorization.findMany({
    where: {
      weekStartDate: {
        gte: parseDateOnly(startDate),
        lte: parseDateOnly(endDate),
      },
      student: {
        isActive: true,
        ...(groupId ? { groupId } : {}),
      },
    },
    orderBy: { weekStartDate: "asc" },
    include: { student: { include: { group: true } } },
  });

  return records.map((r) => ({
    studentName: r.student?.fullName ?? "",
    groupName: r.student?.group?.name ?? null,
    weekStartDate: r.weekStartDate.toISOString().slice(0, 10),
    startSurah: r.startSurah,
    startAyah: r.startAyah,
    endSurah: r.endSurah,
    endAyah: r.endAyah,
    ithmanCount: r.ithmanCount,
  }));
}

// ---------------------------------------------------------------------------
// Camp-wide stats (Admin dashboard home)
// ---------------------------------------------------------------------------

export interface GlobalCampStats {
  teacherCount: number;
  studentCount: number;
  groupCount: number;
  todayAttendanceRate: number;
  totalIthmanThisWeek: number;
}

export async function getGlobalCampStats(): Promise<GlobalCampStats> {
  await requireAdmin();

  const dateOnly = parseDateOnly(todayDateString());
  const weekStartDate = startOfWeek(new Date());

  const [teacherCount, groupCount, activeStudents, weekMemorizations] =
    await Promise.all([
      prisma.user.count({ where: { role: "TEACHER", isActive: true } }),
      prisma.group.count(),
      prisma.student.findMany({
        where: { isActive: true },
        include: { attendances: { where: { date: dateOnly } } },
      }),
      prisma.weeklyMemorization.findMany({ where: { weekStartDate } }),
    ]);

  const studentCount = activeStudents.length;
  const presentCount = activeStudents.filter(
    (s) => (s.attendances?.[0]?.status ?? AttendanceStatus.PRESENT) === AttendanceStatus.PRESENT
  ).length;
  const todayAttendanceRate =
    studentCount === 0 ? 0 : Math.round((presentCount / studentCount) * 100);

  const totalIthmanThisWeek =
    Math.round(
      weekMemorizations.reduce((sum, m) => sum + m.ithmanCount, 0) * 10
    ) / 10;

  return {
    teacherCount,
    studentCount,
    groupCount,
    todayAttendanceRate,
    totalIthmanThisWeek,
  };
}
