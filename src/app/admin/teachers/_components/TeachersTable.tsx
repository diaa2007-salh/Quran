"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, KeyRound } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { setTeacherActive } from "@/lib/actions/admin-actions";
import { CreateTeacherDialog } from "./CreateTeacherDialog";
import { ResetPasswordDialog } from "./ResetPasswordDialog";

interface TeacherRow {
  id: string;
  fullName: string;
  username: string;
  isActive: boolean;
  groups?: { name: string }[];
}

export function TeachersTable({ teachers }: { teachers: TeacherRow[] }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<TeacherRow | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="size-4" />
          إضافة أستاذ
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-paper-border dark:border-ink-border">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-paper-border bg-paper/60 text-paper-text-muted dark:border-ink-border dark:bg-ink/40 dark:text-ink-text-muted">
              <th className="px-4 py-3 text-start font-medium">الاسم</th>
              <th className="px-4 py-3 text-start font-medium">اسم المستخدم</th>
              <th className="px-4 py-3 text-start font-medium">الحلقة</th>
              <th className="px-4 py-3 text-start font-medium">الحالة</th>
              <th className="px-4 py-3 text-start font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher) => (
              <TeacherRowItem
                key={teacher.id}
                teacher={teacher}
                onResetPassword={() => setResetTarget(teacher)}
              />
            ))}
            {teachers.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-paper-text-muted dark:text-ink-text-muted"
                >
                  لا يوجد أساتذة بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CreateTeacherDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
      {resetTarget && (
        <ResetPasswordDialog
          isOpen={Boolean(resetTarget)}
          onClose={() => setResetTarget(null)}
          teacherId={resetTarget.id}
          teacherName={resetTarget.fullName}
        />
      )}
    </div>
  );
}

function TeacherRowItem({
  teacher,
  onResetPassword,
}: {
  teacher: TeacherRow;
  onResetPassword: () => void;
}) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(teacher.isActive);
  const [isPending, startTransition] = useTransition();

  function toggleActive() {
    const previous = isActive;
    const next = !isActive;
    setIsActive(next); // optimistic
    startTransition(async () => {
      const result = await setTeacherActive({
        teacherId: teacher.id,
        isActive: next,
      });
      if (!result.success) {
        setIsActive(previous);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <tr className="border-b border-paper-border last:border-0 dark:border-ink-border">
      <td className="px-4 py-3 font-medium text-paper-text dark:text-ink-text">
        {teacher.fullName}
      </td>
      <td className="px-4 py-3 text-paper-text-muted dark:text-ink-text-muted" dir="ltr">
        {teacher.username}
      </td>
      <td className="px-4 py-3 text-paper-text-muted dark:text-ink-text-muted">
        {teacher.groups && teacher.groups.length > 0
          ? teacher.groups.map((g) => g.name).join("، ")
          : "بدون حلقة"}
      </td>
      <td className="px-4 py-3">
        <StatusBadge tone={isActive ? "green" : "neutral"}>
          {isActive ? "نشط" : "مجمّد"}
        </StatusBadge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onResetPassword}
            aria-label={`إعادة تعيين كلمة مرور ${teacher.fullName}`}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
          >
            <KeyRound className="size-3.5" />
            كلمة المرور
          </button>
          <button
            type="button"
            onClick={toggleActive}
            disabled={isPending}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-paper-text-muted hover:bg-paper-border/40 disabled:opacity-60 dark:text-ink-text-muted dark:hover:bg-ink-border/40"
          >
            {isActive ? "تجميد" : "إلغاء التجميد"}
          </button>
        </div>
      </td>
    </tr>
  );
}
