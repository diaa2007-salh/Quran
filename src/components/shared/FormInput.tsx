import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function FormInput({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: FormInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-paper-text dark:text-ink-text"
      >
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(
          "rounded-lg border bg-paper-surface px-3 py-2.5 text-sm text-paper-text outline-none transition-colors",
          "placeholder:text-paper-text-muted",
          "dark:bg-ink-surface dark:text-ink-text dark:placeholder:text-ink-text-muted",
          error
            ? "border-band-red focus:border-band-red"
            : "border-paper-border focus:border-primary dark:border-ink-border",
          className
        )}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-band-red">
          {error}
        </p>
      ) : hint ? (
        <p
          id={`${inputId}-hint`}
          className="text-xs text-paper-text-muted dark:text-ink-text-muted"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
