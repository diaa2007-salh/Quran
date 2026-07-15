"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export function CustomModal({
  isOpen,
  onClose,
  title,
  children,
  className,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    panelRef.current?.focus();

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeydown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeydown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-modal-title"
        tabIndex={-1}
        className={cn(
          "relative z-10 w-full max-w-md rounded-2xl border border-paper-border bg-paper-surface p-5 shadow-xl outline-none",
          "dark:border-ink-border dark:bg-ink-surface",
          className
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="custom-modal-title"
            className="font-[var(--font-display)] text-lg font-semibold text-paper-text dark:text-ink-text"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-full p-1.5 text-paper-text-muted hover:bg-paper-border/50 dark:text-ink-text-muted dark:hover:bg-ink-border/50"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
