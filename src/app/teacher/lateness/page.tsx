import { getTodayAttendanceForMyGroup } from "@/lib/actions/attendance";
import { AttendanceToggleGrid } from "@/components/shared/AttendanceToggleGrid";
import { todayDateString } from "@/lib/week";

export default async function TeacherLatenessPage() {
  const date = todayDateString();
  const students = await getTodayAttendanceForMyGroup(date);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-paper-text dark:text-ink-text">
          التأخر اليومي
        </h1>
        <p className="mt-1 text-sm text-paper-text-muted dark:text-ink-text-muted">
          اضغط على اسم التلميذ لتسجيل تأخره، واضغط مجددًا للتراجع
        </p>
      </div>

      {students.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-paper-border py-16 text-center text-sm text-paper-text-muted dark:border-ink-border dark:text-ink-text-muted">
          لا يوجد تلاميذ في مجموعتك بعد.
        </p>
      ) : (
        <AttendanceToggleGrid
          date={date}
          students={students}
          toggleStatus="LATE"
          toggleLabel="متأخر"
          tone="yellow"
        />
      )}
    </div>
  );
}
