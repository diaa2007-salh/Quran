"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CustomModal } from "@/components/shared/CustomModal";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { FormInput } from "@/components/shared/FormInput";
import { createStudent } from "@/lib/actions/admin-actions";

export function CreateStudentDialog({
  isOpen,
  onClose,
  groups,
}: {
  isOpen: boolean;
  onClose: () => void;
  groups: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [groupId, setGroupId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setFullName("");
    setGuardianPhone("");
    setGroupId("");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createStudent({
        fullName,
        guardianPhone: guardianPhone || undefined,
        groupId: groupId || undefined,
      });
      if (!result.success) {
        setError("تعذّرت الإضافة، تحقق من البيانات وحاول مرة أخرى.");
        return;
      }
      reset();
      router.refresh();
      onClose();
    });
  }

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={() => (isPending ? null : onClose())}
      title="إضافة تلميذ جديد"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormInput
          label="الاسم الكامل"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <FormInput
          label="رقم ولي الأمر (اختياري)"
          value={guardianPhone}
          onChange={(e) => setGuardianPhone(e.target.value)}
          dir="ltr"
        />
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="create-student-group"
            className="text-sm font-medium text-paper-text dark:text-ink-text"
          >
            الحلقة (اختياري)
          </label>
          <select
            id="create-student-group"
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
          <SubmitButton isPending={isPending}>إضافة</SubmitButton>
        </div>
      </form>
    </CustomModal>
  );
}
