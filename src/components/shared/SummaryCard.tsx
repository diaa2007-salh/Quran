import type { ComponentType } from "react";

export function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-paper-border bg-paper-surface p-5 dark:border-ink-border dark:bg-ink-surface">
      <div className="flex items-center gap-2 text-paper-text-muted dark:text-ink-text-muted">
        <Icon className="size-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-2 font-[var(--font-data)] text-3xl font-semibold text-paper-text dark:text-ink-text">
        {value}
      </p>
      {detail && (
        <p className="mt-1 text-xs text-paper-text-muted dark:text-ink-text-muted">
          {detail}
        </p>
      )}
    </div>
  );
}
