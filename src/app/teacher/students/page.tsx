import { Phone, Users } from "lucide-react";
import { getMyGroupStudents } from "@/lib/actions/students";

export default async function TeacherStudentsPage() {
  const { groupName, students } = await getMyGroupStudents();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-paper-text dark:text-ink-text">
          أسماء التلاميذ
        </h1>
        <p className="mt-1 text-sm text-paper-text-muted dark:text-ink-text-muted">
          {groupName ? `مجموعة ${groupName}` : "لم تُعيَّن مجموعة بعد"} ·{" "}
          {students.length} تلميذ
        </p>
      </div>

      {students.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
            <div
              key={student.id}
              className="flex items-center gap-3 rounded-2xl border border-paper-border bg-paper-surface p-4 dark:border-ink-border dark:bg-ink-surface"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-[var(--font-display)] text-primary">
                {student.fullName.trim().charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-paper-text dark:text-ink-text">
                  {student.fullName}
                </p>
                {student.guardianPhone && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-paper-text-muted dark:text-ink-text-muted">
                    <Phone className="size-3" />
                    <span dir="ltr">{student.guardianPhone}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-paper-border py-16 text-center dark:border-ink-border">
      <Users className="size-8 text-paper-text-muted dark:text-ink-text-muted" />
      <p className="text-sm text-paper-text-muted dark:text-ink-text-muted">
        لا يوجد تلاميذ في مجموعتك بعد. تواصل مع الإدارة لتوزيع التلاميذ.
      </p>
    </div>
  );
}
