import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isPending?: boolean;
  pendingText?: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}

export function SubmitButton({
  isPending = false,
  pendingText = "جارٍ الحفظ...",
  children,
  variant = "primary",
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || isPending}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary"
          ? "bg-primary text-white hover:bg-primary/90"
          : "bg-paper-surface text-paper-text border border-paper-border hover:bg-paper-border/40 dark:bg-ink-surface dark:text-ink-text dark:border-ink-border dark:hover:bg-ink-border/40",
        className
      )}
      {...props}
    >
      {isPending && (
        <span
          className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {isPending ? pendingText : children}
    </button>
  );
}
