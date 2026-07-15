import { Users, GraduationCap, ClipboardCheck, BookOpen, FileBarChart } from "lucide-react";
import Link from "next/link";
import { getGlobalCampStats } from "@/lib/actions/admin-reports";
import { getSettings } from "@/lib/settings-data";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { SettingsPanel } from "./_components/SettingsPanel";

export default async function AdminDashboardPage() {
  const [stats, settings] = await Promise.all([
    getGlobalCampStats(),
    getSettings(),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-paper-text dark:text-ink-text">
          أبرز معلومات في الواجهة الرئيسية للمدير
        </h1>
        <p className="mt-1 text-sm text-paper-text-muted dark:text-ink-text-muted">
          نظرة عامة على المخيم بالكامل
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          icon={Users}
          label="إجمالي التلاميذ النشطين"
          value={String(stats.studentCount)}
          detail={`في ${stats.groupCount} حلقة`}
        />
        <SummaryCard
          icon={GraduationCap}
          label="إجمالي الأساتذة"
          value={String(stats.teacherCount)}
        />
        <SummaryCard
          icon={ClipboardCheck}
          label="نسبة الحضور اليوم"
          value={`${stats.todayAttendanceRate}%`}
          detail="على مستوى المخيم"
        />
        <SummaryCard
          icon={BookOpen}
          label="إجمالي الأثمان هذا الأسبوع"
          value={String(stats.totalIthmanThisWeek)}
          detail="عبر جميع الحلقات"
        />
      </div>

      <Link
        href="/admin/reports"
        className="flex items-center justify-between gap-3 rounded-2xl border border-paper-border bg-paper-surface p-5 transition-colors hover:bg-paper-border/20 dark:border-ink-border dark:bg-ink-surface dark:hover:bg-ink-border/20"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileBarChart className="size-5" />
          </div>
          <div>
            <p className="font-medium text-paper-text dark:text-ink-text">
              التقارير والتصدير
            </p>
            <p className="text-xs text-paper-text-muted dark:text-ink-text-muted">
              سجل الحضور والتحفيظ عبر فترة زمنية - CSV أو طباعة
            </p>
          </div>
        </div>
        <span className="text-primary">←</span>
      </Link>

      <SettingsPanel initial={settings} />
    </div>
  );
}
