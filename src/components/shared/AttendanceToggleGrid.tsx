"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { setAttendanceStatus } from "@/lib/actions/attendance";
import type { AttendanceStatus } from "@/lib/prisma";

export interface AttendanceRow {
  id: string;
  fullName: string;
  status: AttendanceStatus;
}

/**
 * Shared by "التأخر اليومي" (toggleStatus="LATE") and "الغياب اليومي"
 * (toggleStatus="ABSENT") - both are a grid of chips over the SAME
 * Attendance row per student, toggling between PRESENT and one other
 * status. Optimistic: the chip flips immediately and only reverts if the
 * server call comes back with an error.
 */
export function AttendanceToggleGrid({
  date,
  students,
  toggleStatus,
  toggleLabel,
  tone,
}: {
  date: string;
  students: AttendanceRow[];
  toggleStatus: Exclude<AttendanceStatus, "PRESENT">;
  toggleLabel: string;
  tone: "yellow" | "red";
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {students.map((student) => (
        <AttendanceChip
          key={student.id}
          date={date}
          student={student}
          toggleStatus={toggleStatus}
          toggleLabel={toggleLabel}
          tone={tone}
        />
      ))}
    </div>
  );
}

function AttendanceChip({
  date,
  student,
  toggleStatus,
  toggleLabel,
  tone,
}: {
  date: string;
  student: AttendanceRow;
  toggleStatus: Exclude<AttendanceStatus, "PRESENT">;
  toggleLabel: string;
  tone: "yellow" | "red";
}) {
  const [status, setStatus] = useState(student.status);
  const [isPending, startTransition] = useTransition();
  const isToggled = status === toggleStatus;

  function toggle() {
    const previous = status;
    const next = isToggled ? "PRESENT" : toggleStatus;
    setStatus(next); // optimistic
    startTransition(async () => {
      const result = await setAttendanceStatus({
        studentId: student.id,
        date,
        status: next,
      });
      if (!result.success) {
        setStatus(previous); // revert on failure
      }
    });
  }

  const toggledClasses =
    tone === "yellow"
      ? "border-band-yellow bg-band-yellow-soft text-band-yellow dark:border-band-yellow/40 dark:bg-band-yellow/15"
      : "border-band-red bg-band-red-soft text-band-red dark:border-band-red/40 dark:bg-band-red/15";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={isToggled}
      className={cn(
        "flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors disabled:opacity-60",
        isToggled
          ? toggledClasses
          : "border-paper-border bg-paper-surface text-paper-text hover:bg-paper-border/40 dark:border-ink-border dark:bg-ink-surface dark:text-ink-text dark:hover:bg-ink-border/40"
      )}
    >
      <span>{student.fullName}</span>
      <span
        className={cn(
          "flex items-center gap-1 text-xs",
          isToggled
            ? ""
            : "text-paper-text-muted dark:text-ink-text-muted"
        )}
      >
        {isToggled ? (
          toggleLabel
        ) : (
          <>
            <Check className="size-3.5" /> حاضر
          </>
        )}
      </span>
    </button>
  );
}
