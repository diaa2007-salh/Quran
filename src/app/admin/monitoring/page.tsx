import { ActivitySquare } from "lucide-react";
import {
  getTeacherMonitoringBoard,
  type MonitoringStatus,
} from "@/lib/actions/admin-reports";
import { StatusBadge, type BadgeTone } from "@/components/shared/StatusBadge";

const STATUS_META: Record<
  MonitoringStatus,
  { label: string; tone: BadgeTone }
> = {
  on_track: { label: "منتظم", tone: "green" },
  partial: { label: "جزئي", tone: "yellow" },
  behind: { label: "متأخر في التسجيل", tone: "red" },
  no_students: { label: "بدون تلاميذ", tone: "neutral" },
};

export default async function AdminMonitoringPage() {
  const rows = await getTeacherMonitoringBoard();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-[var(--font-display)] text-2xl font-semibold text-paper-text dark:text-ink-text">
          لوحة حالة مراقبة الأساتذة
        </h1>
        <p className="mt-1 text-sm text-paper-text-muted dark:text-ink-text-muted">
          هل سجّل كل أستاذ الحضور اليوم والتحفيظ لهذا الأسبوع؟
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-paper-border py-16 text-center dark:border-ink-border">
          <ActivitySquare className="size-8 text-paper-text-muted dark:text-ink-text-muted" />
          <p className="text-sm text-paper-text-muted dark:text-ink-text-muted">
            لا يوجد أساتذة بعد
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const meta = STATUS_META[row.status];
            return (
              <li
                key={row.teacherId}
                className="rounded-2xl border border-paper-border bg-paper-surface p-4 dark:border-ink-border dark:bg-ink-surface"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-paper-text dark:text-ink-text">
                      {row.teacherName}
                      {!row.isActive && (
                        <span className="ms-2 text-xs text-paper-text-muted dark:text-ink-text-muted">
                          (مجمّد)
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-paper-text-muted dark:text-ink-text-muted">
                      {row.groupNames.length > 0
                        ? row.groupNames.join("، ")
                        : "بدون حلقة"}
                    </p>
                  </div>
                  <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                </div>

                {row.studentCount > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <MetricBar
                      label="الحضور اليوم"
                      done={row.attendanceLoggedCount}
                      total={row.studentCount}
                    />
                    <MetricBar
                      label="التحفيظ هذا الأسبوع"
                      done={row.memorizationLoggedCount}
                      total={row.studentCount}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function MetricBar({
  label,
  done,
  total,
}: {
  label: string;
  done: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-paper-text-muted dark:text-ink-text-muted">
        <span>{label}</span>
        <span className="font-[var(--font-data)] tabular-nums">
          {done}/{total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-paper-border dark:bg-ink-border">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
