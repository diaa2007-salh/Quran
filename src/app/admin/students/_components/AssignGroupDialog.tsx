"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CustomModal } from "@/components/shared/CustomModal";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { assignStudentToGroup } from "@/lib/actions/admin-actions";

export function AssignGroupDialog({
  isOpen,
  onClose,
  studentId,
  studentName,
  currentGroupId,
  groups,
}: {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  currentGroupId: string | null;
  groups: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [groupId, setGroupId] = useState(currentGroupId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await assignStudentToGroup({
        studentId,
        groupId: groupId || null,
      });
      if (!result.success) {
        setError("تعذّر التعيين، حاول مرة أخرى.");
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <CustomModal isOpen={isOpen} onClose={onClose} title={`تعيين حلقة - ${studentName}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="assign-group"
            className="text-sm font-medium text-paper-text dark:text-ink-text"
          >
            الحلقة
          </label>
          <select
            id="assign-group"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="rounded-lg border border-paper-border bg-paper-surface px-3 py-2.5 text-sm text-paper-text outline-none focus:border-primary dark:border-ink-border dark:bg-ink-surface dark:text-ink-text"
          >
            <option value="">بدون حلقة</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p className="rounded-lg bg-band-red-soft px-3 py-2 text-sm text-band-red dark:bg-band-red/15">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <SubmitButton isPending={isPending}>حفظ</SubmitButton>
        </div>
      </form>
    </CustomModal>
  );
}
