"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { CustomModal } from "@/components/shared/CustomModal";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { cn } from "@/lib/cn";

export function DeleteButton({
  itemLabel,
  confirmTitle,
  confirmDescription,
  onConfirm,
  className,
}: {
  /** Shown on the trigger button's accessible label, e.g. "حذف مجموعة الفجر". */
  itemLabel: string;
  confirmTitle: string;
  confirmDescription: string;
  onConfirm: () => Promise<{ success: boolean; error?: string }>;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await onConfirm();
      if (result.success) {
        setIsOpen(false);
      } else {
        setError(result.error ?? "تعذّر الحذف، حاول مرة أخرى.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={itemLabel}
        className={cn(
          "inline-flex items-center justify-center rounded-lg p-2 text-band-red hover:bg-band-red-soft dark:hover:bg-band-red/15",
          className
        )}
      >
        <Trash2 className="size-4" />
      </button>

      <CustomModal
        isOpen={isOpen}
        onClose={() => (isPending ? null : setIsOpen(false))}
        title={confirmTitle}
      >
        <p className="mb-4 text-sm text-paper-text-muted dark:text-ink-text-muted">
          {confirmDescription}
        </p>
        {error && (
          <p className="mb-4 rounded-lg bg-band-red-soft px-3 py-2 text-sm text-band-red dark:bg-band-red/15">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-paper-text-muted hover:bg-paper-border/40 disabled:opacity-60 dark:text-ink-text-muted dark:hover:bg-ink-border/40"
          >
            تراجع
          </button>
          <SubmitButton
            type="button"
            onClick={handleConfirm}
            isPending={isPending}
            pendingText="جارٍ الحذف..."
            className="!bg-band-red hover:!bg-band-red/90"
          >
            نعم، احذف
          </SubmitButton>
        </div>
      </CustomModal>
    </>
  );
}
