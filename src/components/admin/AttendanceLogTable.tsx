"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarDays } from "lucide-react";
import {
  getAllStudentsAttendance,
  type StudentAttendanceRow,
} from "@/lib/actions/admin-reports";
import type { AttendanceStatus } from "@/lib/prisma";

export function AttendanceLogTable({
  initialRows,
  initialDate,
  groups,
  status,
  emptyLabel,
}: {
  initialRows: StudentAttendanceRow[];
  initialDate: string;
  groups: { id: string; name: string }[];
  status: Exclude<AttendanceStatus, "PRESENT">;
  emptyLabel: string;
}) {
  const [date, setDate] = useState(initialDate);
  const [rows, setRows] = useState(initialRows);
  const [groupFilter, setGroupFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (date === initialDate) return; // avoid refetching the server-provided first load
    startTransition(async () => {
      const result = await getAllStudentsAttendance({ date, status });
      setRows(result);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const groupId = groupFilter || null;
  const groupName = groups.find((g) => g.id === groupFilter)?.name;
  const visibleRows = groupId
    ? rows.filter((r) => r.groupName === groupName)
    : rows;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <CalendarDays className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-paper-text-muted dark:text-ink-text-muted" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-paper-border bg-paper-surface py-2.5 ps-9 pe-3 text-sm text-paper-text outline-none focus:border-primary dark:border-ink-border dark:bg-ink-surface dark:text-ink-text"
          />
        </div>
        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="rounded-lg border border-paper-border bg-paper-surface px-3 py-2.5 text-sm text-paper-text outline-none focus:border-primary dark:border-ink-border dark:bg-ink-surface dark:text-ink-text"
        >
          <option value="">كل الحلقات</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        {isPending && (
          <span className="text-xs text-paper-text-muted dark:text-ink-text-muted">
            جارٍ التحميل...
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-paper-border dark:border-ink-border">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-paper-border bg-paper/60 text-paper-text-muted dark:border-ink-border dark:bg-ink/40 dark:text-ink-text-muted">
              <th className="px-4 py-3 text-start font-medium">الاسم</th>
              <th className="px-4 py-3 text-start font-medium">الحلقة</th>
              <th className="px-4 py-3 text-start font-medium">المعلّم</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                key={row.studentId}
                className="border-b border-paper-border last:border-0 dark:border-ink-border"
              >
                <td className="px-4 py-3 font-medium text-paper-text dark:text-ink-text">
                  {row.studentName}
                </td>
                <td className="px-4 py-3 text-paper-text-muted dark:text-ink-text-muted">
                  {row.groupName ?? "بدون حلقة"}
                </td>
                <td className="px-4 py-3 text-paper-text-muted dark:text-ink-text-muted">
                  {row.teacherName ?? "-"}
                </td>
              </tr>
            ))}
            {visibleRows.length === 0 && !isPending && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-10 text-center text-paper-text-muted dark:text-ink-text-muted"
                >
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
