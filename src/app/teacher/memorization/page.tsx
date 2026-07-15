import { BookOpen } from "lucide-react";
import { getMyGroupMemorizationOverview } from "@/lib/actions/memorization";
import { IthmanMeter } from "@/components/shared/IthmanMeter";
import { currentWeekStartString } from "@/lib/week";
import { MemorizationEntryButton } from "./_components/MemorizationEntryButton";

export default async function TeacherMemorizationPage() {
  const weekStart = currentWeekStartString();
  const overview = await getMyGroupMemorizationOverview(weekStart);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-paper-text dark:text-ink-text">
          التحفيظ الأسبوعي
        </h1>
        <p className="mt-1 text-sm text-paper-text-muted dark:text-ink-text-muted">
          نقطة البداية تُقفَل تلقائيًا من نهاية الأسبوع الماضي - أدخل نهاية
          هذا الأسبوع فقط
        </p>
      </div>

      {overview.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-paper-border py-16 text-center dark:border-ink-border">
          <BookOpen className="size-8 text-paper-text-muted dark:text-ink-text-muted" />
          <p className="text-sm text-paper-text-muted dark:text-ink-text-muted">
            لا يوجد تلاميذ في مجموعتك بعد.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {overview.map((student) => (
            <li
              key={student.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-paper-border bg-paper-surface p-4 dark:border-ink-border dark:bg-ink-surface"
            >
              <span className="font-medium text-paper-text dark:text-ink-text">
                {student.fullName}
              </span>
              <div className="flex items-center gap-4">
                <IthmanMeter ithmanCount={student.ithmanCount} band={student.band} />
                <MemorizationEntryButton
                  studentId={student.id}
                  studentName={student.fullName}
                  weekStart={weekStart}
                  isRecorded={student.recorded}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
