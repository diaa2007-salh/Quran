"use client";

import { useMemo, useState } from "react";
import { Plus, Search, UserCog } from "lucide-react";
import { AssignGroupDialog } from "./AssignGroupDialog";
import { CreateStudentDialog } from "./CreateStudentDialog";

const PAGE_SIZE = 20;

interface StudentRow {
  id: string;
  fullName: string;
  guardianPhone: string | null;
  groupId: string | null;
  group?: { id: string; name: string; teacher?: { fullName: string } | null } | null;
}

export function StudentsTable({
  students,
  groups,
}: {
  students: StudentRow[];
  groups: { id: string; name: string }[];
}) {
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [page, setPage] = useState(1);
  const [assignTarget, setAssignTarget] = useState<StudentRow | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch = s.fullName
        .toLowerCase()
        .includes(search.trim().toLowerCase());
      const matchesGroup = !groupFilter || s.groupId === groupFilter;
      return matchesSearch && matchesGroup;
    });
  }, [students, search, groupFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-paper-text-muted dark:text-ink-text-muted" />
          <input
            type="search"
            placeholder="ابحث عن تلميذ..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-paper-border bg-paper-surface py-2.5 ps-9 pe-3 text-sm text-paper-text outline-none focus:border-primary dark:border-ink-border dark:bg-ink-surface dark:text-ink-text"
          />
        </div>
        <select
          value={groupFilter}
          onChange={(e) => {
            setGroupFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-paper-border bg-paper-surface px-3 py-2.5 text-sm text-paper-text outline-none focus:border-primary dark:border-ink-border dark:bg-ink-surface dark:text-ink-text"
        >
          <option value="">كل الحلقات</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="size-4" />
          إضافة تلميذ
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-paper-border dark:border-ink-border">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-paper-border bg-paper/60 text-paper-text-muted dark:border-ink-border dark:bg-ink/40 dark:text-ink-text-muted">
              <th className="px-4 py-3 text-start font-medium">الاسم</th>
              <th className="px-4 py-3 text-start font-medium">الحلقة</th>
              <th className="px-4 py-3 text-start font-medium">المعلّم</th>
              <th className="px-4 py-3 text-start font-medium">ولي الأمر</th>
              <th className="px-4 py-3 text-start font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((student) => (
              <tr
                key={student.id}
                className="border-b border-paper-border last:border-0 dark:border-ink-border"
              >
                <td className="px-4 py-3 font-medium text-paper-text dark:text-ink-text">
                  {student.fullName}
                </td>
                <td className="px-4 py-3 text-paper-text-muted dark:text-ink-text-muted">
                  {student.group?.name ?? "بدون حلقة"}
                </td>
                <td className="px-4 py-3 text-paper-text-muted dark:text-ink-text-muted">
                  {student.group?.teacher?.fullName ?? "-"}
                </td>
                <td className="px-4 py-3 text-paper-text-muted dark:text-ink-text-muted" dir="ltr">
                  {student.guardianPhone ?? "-"}
                </td>
                <td className="px-4 py-3 text-end">
                  <button
                    type="button"
                    onClick={() => setAssignTarget(student)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
                  >
                    <UserCog className="size-3.5" />
                    تعيين حلقة
                  </button>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-paper-text-muted dark:text-ink-text-muted"
                >
                  لا توجد نتائج مطابقة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg px-3 py-1.5 text-paper-text-muted hover:bg-paper-border/40 disabled:opacity-40 dark:text-ink-text-muted dark:hover:bg-ink-border/40"
          >
            السابق
          </button>
          <span className="font-[var(--font-data)] text-paper-text-muted dark:text-ink-text-muted">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg px-3 py-1.5 text-paper-text-muted hover:bg-paper-border/40 disabled:opacity-40 dark:text-ink-text-muted dark:hover:bg-ink-border/40"
          >
            التالي
          </button>
        </div>
      )}

      {assignTarget && (
        <AssignGroupDialog
          isOpen={Boolean(assignTarget)}
          onClose={() => setAssignTarget(null)}
          studentId={assignTarget.id}
          studentName={assignTarget.fullName}
          currentGroupId={assignTarget.groupId}
          groups={groups}
        />
      )}

      <CreateStudentDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        groups={groups}
      />
    </div>
  );
}
