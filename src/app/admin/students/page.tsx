import { getAllStudents, getAllGroups } from "@/lib/actions/admin-actions";
import { StudentsTable } from "./_components/StudentsTable";

export default async function AdminStudentsPage() {
  const [students, groups] = await Promise.all([
    getAllStudents(),
    getAllGroups(),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-paper-text dark:text-ink-text">
          قائمة جميع التلاميذ
        </h1>
        <p className="mt-1 text-sm text-paper-text-muted dark:text-ink-text-muted">
          {students.length} تلميذ عبر {groups.length} حلقة
        </p>
      </div>

      <StudentsTable
        students={students}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
      />
    </div>
  );
}
