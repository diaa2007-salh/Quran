import Link from "next/link";
import { ClipboardCheck, BookOpen, Clock, UserX } from "lucide-react";
import { getTodayAttendanceSummary } from "@/lib/actions/attendance";
import { getMyGroupMemorizationOverview } from "@/lib/actions/memorization";
import { IthmanMeter } from "@/components/shared/IthmanMeter";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { todayDateString, currentWeekStartString } from "@/lib/week";

export default async function TeacherDashboardPage() {
  const today = todayDateString();
  const weekStart = currentWeekStartString();

  const [attendance, memorization] = await Promise.all([
    getTodayAttendanceSummary(today),
    getMyGroupMemorizationOverview(weekStart),
  ]);

  const recordedCount = memorization.filter((m) => m.recorded).length;
  const totalIthman = memorization.reduce(
    (sum, m) => sum + (m.ithmanCount ?? 0),
    0
  );
  const needsAttention = memorization.filter((m) => m.band === "RED");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-paper-text dark:text-ink-text">
          أبرز المعلومات في الواجهة الرئيسية
        </h1>
        <p className="mt-1 text-sm text-paper-text-muted dark:text-ink-text-muted">
          نظرة سريعة على مجموعتك اليوم
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          icon={ClipboardCheck}
          label="نسبة الحضور اليوم"
          value={`${attendance.presentRate}%`}
          detail={`${attendance.present} من ${attendance.total} حاضر`}
        />
        <SummaryCard
          icon={BookOpen}
          label="إجمالي الأثمان هذا الأسبوع"
          value={String(Math.round(totalIthman * 10) / 10)}
          detail={`تم تسجيل ${recordedCount} من ${memorization.length} تلميذ`}
        />
        <SummaryCard
          icon={Clock}
          label="متأخرون اليوم"
          value={String(attendance.late)}
        />
        <SummaryCard
          icon={UserX}
          label="غائبون اليوم"
          value={String(attendance.absent)}
        />
      </div>

      {needsAttention.length > 0 && (
        <div className="rounded-2xl border border-band-red-soft bg-band-red-soft/50 p-5 dark:border-band-red/20 dark:bg-band-red/10">
          <h2 className="font-medium text-band-red">
            يحتاجون متابعة هذا الأسبوع
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {needsAttention.map((student) => (
              <li
                key={student.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-paper-text dark:text-ink-text">
                  {student.fullName}
                </span>
                <IthmanMeter
                  ithmanCount={student.ithmanCount}
                  band={student.band}
                />
              </li>
            ))}
          </ul>
          <Link
            href="/teacher/memorization"
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            فتح التحفيظ الأسبوعي ←
          </Link>
        </div>
      )}
    </div>
  );
}
