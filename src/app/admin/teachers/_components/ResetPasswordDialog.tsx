"use client";

import { useState, useTransition } from "react";
import { CustomModal } from "@/components/shared/CustomModal";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { FormInput } from "@/components/shared/FormInput";
import { resetTeacherPassword } from "@/lib/actions/admin-actions";

export function ResetPasswordDialog({
  isOpen,
  onClose,
  teacherId,
  teacherName,
}: {
  isOpen: boolean;
  onClose: () => void;
  teacherId: string;
  teacherName: string;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await resetTeacherPassword({ teacherId, newPassword });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDone(true);
    });
  }

  function handleClose() {
    setNewPassword("");
    setError(null);
    setDone(false);
    onClose();
  }

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={() => (isPending ? null : handleClose())}
      title={`إعادة تعيين كلمة المرور - ${teacherName}`}
    >
      {done ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="text-sm text-paper-text dark:text-ink-text">
            تم تحديث كلمة المرور بنجاح
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="text-sm font-medium text-primary hover:underline"
          >
            إغلاق
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormInput
            label="كلمة المرور الجديدة"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            dir="ltr"
            required
            hint="8 أحرف على الأقل"
          />
          {error && (
            <p className="rounded-lg bg-band-red-soft px-3 py-2 text-sm text-band-red dark:bg-band-red/15">
              {error}
            </p>
          )}
          <div className="flex justify-end">
            <SubmitButton isPending={isPending}>تحديث</SubmitButton>
          </div>
        </form>
      )}
    </CustomModal>
  );
}
