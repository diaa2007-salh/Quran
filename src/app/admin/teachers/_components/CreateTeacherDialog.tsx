"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CustomModal } from "@/components/shared/CustomModal";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { FormInput } from "@/components/shared/FormInput";
import { createTeacher } from "@/lib/actions/admin-actions";

export function CreateTeacherDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setFullName("");
    setUsername("");
    setPassword("");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createTeacher({ fullName, username, password });
      if (!result.success) {
        setError(result.error);
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
      title="إضافة أستاذ جديد"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormInput
          label="الاسم الكامل"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <FormInput
          label="اسم المستخدم"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          dir="ltr"
          required
          hint="3 أحرف على الأقل"
        />
        <FormInput
          label="كلمة المرور"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
          <SubmitButton isPending={isPending}>إضافة</SubmitButton>
        </div>
      </form>
    </CustomModal>
  );
}
