"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { safeParseOrError } from "@/lib/actions/action-result";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

// ---------------------------------------------------------------------------
// Teachers
// ---------------------------------------------------------------------------

const createTeacherSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  fullName: z.string().min(1),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;

export async function createTeacher(input: CreateTeacherInput) {
  await requireAdmin();
  const parsed = safeParseOrError(
    createTeacherSchema,
    input,
    "تحقق من البيانات: اسم المستخدم 3 أحرف على الأقل، وكلمة المرور 8 أحرف على الأقل."
  );
  if (!parsed.success) return parsed;
  const { username, password, fullName } = parsed.data;

  try {
    const hashedPassword = await hashPassword(password);
    const teacher = await prisma.user.create({
      data: { username, hashedPassword, fullName, role: "TEACHER" },
    });
    revalidatePath("/admin/teachers");
    return { success: true as const, teacherId: teacher.id };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false as const,
        error: "اسم المستخدم هذا مُستخدَم بالفعل.",
      };
    }
    throw error;
  }
}

const setTeacherActiveSchema = z.object({
  teacherId: z.string().min(1),
  isActive: z.boolean(),
});

/** Freeze (isActive: false) / unfreeze a teacher account. A frozen account
 * is blocked on its very next Server Action call - see lib/auth-guard.ts,
 * which re-reads this row from the DB on every guarded action rather than
 * trusting the JWT alone. */
export async function setTeacherActive(
  input: z.infer<typeof setTeacherActiveSchema>
) {
  await requireAdmin();
  const parsed = safeParseOrError(
    setTeacherActiveSchema,
    input,
    "تعذّر تنفيذ الطلب."
  );
  if (!parsed.success) return parsed;
  const { teacherId, isActive } = parsed.data;

  await prisma.user.update({ where: { id: teacherId }, data: { isActive } });

  revalidatePath("/admin/teachers");
  return { success: true as const };
}

const resetPasswordSchema = z.object({
  teacherId: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function resetTeacherPassword(
  input: z.infer<typeof resetPasswordSchema>
) {
  await requireAdmin();
  const parsed = safeParseOrError(
    resetPasswordSchema,
    input,
    "كلمة المرور يجب أن تكون 8 أحرف على الأقل."
  );
  if (!parsed.success) return parsed;
  const { teacherId, newPassword } = parsed.data;

  try {
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: teacherId },
      data: { hashedPassword },
    });
    return { success: true as const };
  } catch {
    return {
      success: false as const,
      error: "تعذّر تحديث كلمة المرور، حاول مرة أخرى.",
    };
  }
}

export async function getAllTeachers() {
  await requireAdmin();
  return prisma.user.findMany({
    where: { role: "TEACHER" },
    orderBy: { fullName: "asc" },
    include: { groups: true },
  });
}

// ---------------------------------------------------------------------------
// Groups (Halaqat)
// ---------------------------------------------------------------------------

const createGroupSchema = z.object({
  name: z.string().min(1),
  teacherId: z.string().optional(),
});

export async function createGroup(input: z.infer<typeof createGroupSchema>) {
  await requireAdmin();
  const parsed = safeParseOrError(
    createGroupSchema,
    input,
    "اسم الحلقة مطلوب."
  );
  if (!parsed.success) return parsed;
  const { name, teacherId } = parsed.data;

  const group = await prisma.group.create({
    data: { name, teacherId: teacherId || null },
  });

  revalidatePath("/admin/groups");
  return { success: true as const, groupId: group.id };
}

const updateGroupSchema = z.object({
  groupId: z.string().min(1),
  name: z.string().min(1).optional(),
  teacherId: z.string().nullable().optional(),
});

export async function updateGroup(input: z.infer<typeof updateGroupSchema>) {
  await requireAdmin();
  const parsed = safeParseOrError(
    updateGroupSchema,
    input,
    "تعذّر تحديث الحلقة."
  );
  if (!parsed.success) return parsed;
  const { groupId, name, teacherId } = parsed.data;

  await prisma.group.update({
    where: { id: groupId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(teacherId !== undefined ? { teacherId } : {}),
    },
  });

  revalidatePath("/admin/groups");
  return { success: true as const };
}

/** Deleting a group does NOT delete its students - schema.prisma sets
 * their groupId to null (onDelete: SetNull), they just become unassigned
 * and still show up in "All Students". */
export async function deleteGroup(groupId: string) {
  await requireAdmin();
  await prisma.group.delete({ where: { id: groupId } });

  revalidatePath("/admin/groups");
  revalidatePath("/admin/students");
  return { success: true as const };
}

export async function getAllGroups() {
  await requireAdmin();
  return prisma.group.findMany({
    orderBy: { name: "asc" },
    include: { teacher: true, students: true },
  });
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

const createStudentSchema = z.object({
  fullName: z.string().min(1),
  guardianPhone: z.string().optional(),
  groupId: z.string().optional(),
});

export async function createStudent(input: z.infer<typeof createStudentSchema>) {
  await requireAdmin();
  const parsed = safeParseOrError(
    createStudentSchema,
    input,
    "اسم التلميذ مطلوب."
  );
  if (!parsed.success) return parsed;
  const { fullName, guardianPhone, groupId } = parsed.data;

  const student = await prisma.student.create({
    data: {
      fullName,
      guardianPhone: guardianPhone || null,
      groupId: groupId || null,
    },
  });

  revalidatePath("/admin/students");
  if (groupId) revalidatePath("/teacher");
  return { success: true as const, studentId: student.id };
}

const assignStudentSchema = z.object({
  studentId: z.string().min(1),
  groupId: z.string().nullable(),
});

/** Moves a student to a different halaqa, or unassigns them (groupId:
 * null). Once assigned, the student shows up on that teacher's "أسماء
 * التلاميذ" list on their very next page load - revalidatePath("/teacher")
 * covers the shared dashboard route, and each teacher's own guard scopes
 * results to `group.teacherId === session user`, so this alone is safe to
 * broadcast without leaking one teacher's roster to another. */
export async function assignStudentToGroup(
  input: z.infer<typeof assignStudentSchema>
) {
  await requireAdmin();
  const parsed = safeParseOrError(
    assignStudentSchema,
    input,
    "تعذّر تعيين التلميذ."
  );
  if (!parsed.success) return parsed;
  const { studentId, groupId } = parsed.data;

  await prisma.student.update({ where: { id: studentId }, data: { groupId } });

  revalidatePath("/admin/students");
  revalidatePath("/admin/groups");
  revalidatePath("/teacher");
  return { success: true as const };
}

export async function getAllStudents() {
  await requireAdmin();
  return prisma.student.findMany({
    orderBy: { fullName: "asc" },
    include: { group: { include: { teacher: true } } },
  });
}
