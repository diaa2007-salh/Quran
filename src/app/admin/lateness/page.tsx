import { getAllStudentsAttendance } from "@/lib/actions/admin-reports";
import { getAllGroups } from "@/lib/actions/admin-actions";
import { AttendanceLogTable } from "@/components/admin/AttendanceLogTable";
import { todayDateString } from "@/lib/week";

export default async function AdminLatenessPage() {
  const date = todayDateString();
  const [rows, groups] = await Promise.all([
    getAllStudentsAttendance({ date, status: "LATE" }),
    getAllGroups(),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-paper-text dark:text-ink-text">
          تأخرات جميع التلاميذ
        </h1>
        <p className="mt-1 text-sm text-paper-text-muted dark:text-ink-text-muted">
          سجل التأخر عبر جميع الحلقات
        </p>
      </div>

      <AttendanceLogTable
        initialRows={rows}
        initialDate={date}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        status="LATE"
        emptyLabel="لا يوجد متأخرون في هذا اليوم"
      />
    </div>
  );
}
