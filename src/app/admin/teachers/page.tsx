import { getAllTeachers } from "@/lib/actions/admin-actions";
import { TeachersTable } from "./_components/TeachersTable";

export default async function AdminTeachersPage() {
  const teachers = await getAllTeachers();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-paper-text dark:text-ink-text">
          قائمة الأساتذة
        </h1>
        <p className="mt-1 text-sm text-paper-text-muted dark:text-ink-text-muted">
          {teachers.length} أستاذ مسجّل
        </p>
      </div>

      <TeachersTable teachers={teachers} />
    </div>
  );
}
