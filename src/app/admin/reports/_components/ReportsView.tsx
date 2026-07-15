"use client";

import { useEffect, useState, useTransition } from "react";
import { Download, Printer } from "lucide-react";
import {
  getAttendanceReport,
  getMemorizationReport,
  type AttendanceReportRow,
  type MemorizationReportRow,
} from "@/lib/actions/admin-reports";
import { exportToCsv } from "@/lib/csv-export";
import { surahName } from "@/lib/surah-names";
import { ithmanBand } from "@/lib/quran";
import { StatusBadge, type BadgeTone } from "@/components/shared/StatusBadge";
import type { AttendanceStatus } from "@/lib/prisma";

type ReportType = "attendance" | "memorization";

const STATUS_META: Record<AttendanceStatus, { label: string; tone: BadgeTone }> = {
  PRESENT: { label: "حاضر", tone: "green" },
  LATE: { label: "متأخر", tone: "yellow" },
  ABSENT: { label: "غائب", tone: "red" },
};

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function ReportsView({
  groups,
}: {
  groups: { id: string; name: string }[];
}) {
  const [reportType, setReportType] = useState<ReportType>("attendance");
  const [startDate, setStartDate] = useState(isoDaysAgo(7));
  const [endDate, setEndDate] = useState(isoDaysAgo(0));
  const [groupId, setGroupId] = useState("");
  const [attendanceRows, setAttendanceRows] = useState<AttendanceReportRow[]>([]);
  const [memorizationRows, setMemorizationRows] = useState<
    MemorizationReportRow[]
  >([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const filter = { startDate, endDate, groupId: groupId || undefined };
      if (reportType === "attendance") {
        setAttendanceRows(await getAttendanceReport(filter));
      } else {
        setMemorizationRows(await getMemorizationReport(filter));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, startDate, endDate, groupId]);

  function handleExport() {
    if (reportType === "attendance") {
      exportToCsv(
        `attendance-${startDate}-to-${endDate}.csv`,
        [
          { key: "date", label: "التاريخ" },
          { key: "studentName", label: "الاسم" },
          { key: "groupName", label: "الحلقة" },
          { key: "status", label: "الحالة" },
        ],
        attendanceRows.map((r) => ({
          ...r,
          groupName: r.groupName ?? "",
          status: STATUS_META[r.status].label,
        }))
      );
    } else {
      exportToCsv(
        `memorization-${startDate}-to-${endDate}.csv`,
        [
          { key: "weekStartDate", label: "بداية الأسبوع" },
          { key: "studentName", label: "الاسم" },
          { key: "groupName", label: "الحلقة" },
          { key: "range", label: "المقطع" },
          { key: "ithmanCount", label: "الأثمان" },
        ],
        memorizationRows.map((r) => ({
          ...r,
          groupName: r.groupName ?? "",
          range: `${surahName(r.startSurah)} ${r.startAyah} - ${surahName(r.endSurah)} ${r.endAyah}`,
        }))
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <div className="inline-flex rounded-lg border border-paper-border p-1 dark:border-ink-border">
          <button
            type="button"
            onClick={() => setReportType("attendance")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              reportType === "attendance"
                ? "bg-primary text-white"
                : "text-paper-text-muted dark:text-ink-text-muted"
            }`}
          >
            الحضور
          </button>
          <button
            type="button"
            onClick={() => setReportType("memorization")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              reportType === "memorization"
                ? "bg-primary text-white"
                : "text-paper-text-muted dark:text-ink-text-muted"
            }`}
          >
            التحفيظ
          </button>
        </div>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-lg border border-paper-border bg-paper-surface px-3 py-2 text-sm text-paper-text outline-none focus:border-primary dark:border-ink-border dark:bg-ink-surface dark:text-ink-text"
        />
        <span className="text-paper-text-muted dark:text-ink-text-muted">إلى</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded-lg border border-paper-border bg-paper-surface px-3 py-2 text-sm text-paper-text outline-none focus:border-primary dark:border-ink-border dark:bg-ink-surface dark:text-ink-text"
        />

        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="rounded-lg border border-paper-border bg-paper-surface px-3 py-2 text-sm text-paper-text outline-none focus:border-primary dark:border-ink-border dark:bg-ink-surface dark:text-ink-text"
        >
          <option value="">كل الحلقات</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        <div className="ms-auto flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg border border-paper-border px-3 py-2 text-sm font-medium text-paper-text hover:bg-paper-border/40 dark:border-ink-border dark:text-ink-text dark:hover:bg-ink-border/40"
          >
            <Download className="size-4" />
            تصدير CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Printer className="size-4" />
            طباعة
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-paper-border dark:border-ink-border print:border-0">
        {reportType === "attendance" ? (
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-paper-border bg-paper/60 text-paper-text-muted dark:border-ink-border dark:bg-ink/40 dark:text-ink-text-muted">
                <th className="px-4 py-3 text-start font-medium">التاريخ</th>
                <th className="px-4 py-3 text-start font-medium">الاسم</th>
                <th className="px-4 py-3 text-start font-medium">الحلقة</th>
                <th className="px-4 py-3 text-start font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-paper-border last:border-0 dark:border-ink-border"
                >
                  <td className="px-4 py-3 font-[var(--font-data)] text-paper-text-muted dark:text-ink-text-muted">
                    {row.date}
                  </td>
                  <td className="px-4 py-3 font-medium text-paper-text dark:text-ink-text">
                    {row.studentName}
                  </td>
                  <td className="px-4 py-3 text-paper-text-muted dark:text-ink-text-muted">
                    {row.groupName ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={STATUS_META[row.status].tone}>
                      {STATUS_META[row.status].label}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
              {attendanceRows.length === 0 && !isPending && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-paper-text-muted dark:text-ink-text-muted"
                  >
                    لا توجد سجلات في هذه الفترة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-paper-border bg-paper/60 text-paper-text-muted dark:border-ink-border dark:bg-ink/40 dark:text-ink-text-muted">
                <th className="px-4 py-3 text-start font-medium">الأسبوع</th>
                <th className="px-4 py-3 text-start font-medium">الاسم</th>
                <th className="px-4 py-3 text-start font-medium">الحلقة</th>
                <th className="px-4 py-3 text-start font-medium">المقطع</th>
                <th className="px-4 py-3 text-start font-medium">الأثمان</th>
              </tr>
            </thead>
            <tbody>
              {memorizationRows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-paper-border last:border-0 dark:border-ink-border"
                >
                  <td className="px-4 py-3 font-[var(--font-data)] text-paper-text-muted dark:text-ink-text-muted">
                    {row.weekStartDate}
                  </td>
                  <td className="px-4 py-3 font-medium text-paper-text dark:text-ink-text">
                    {row.studentName}
                  </td>
                  <td className="px-4 py-3 text-paper-text-muted dark:text-ink-text-muted">
                    {row.groupName ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-paper-text-muted dark:text-ink-text-muted">
                    {surahName(row.startSurah)} {row.startAyah} - {surahName(row.endSurah)}{" "}
                    {row.endAyah}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      tone={
                        {
                          RED: "red" as const,
                          YELLOW: "yellow" as const,
                          GREEN: "green" as const,
                        }[ithmanBand(row.ithmanCount)]
                      }
                    >
                      {row.ithmanCount}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
              {memorizationRows.length === 0 && !isPending && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-paper-text-muted dark:text-ink-text-muted"
                  >
                    لا توجد سجلات في هذه الفترة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
