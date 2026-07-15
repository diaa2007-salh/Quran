import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "green" | "yellow" | "red" | "neutral" | "primary";

const TONE_STYLES: Record<BadgeTone, string> = {
  green:
    "bg-band-green-soft text-band-green dark:bg-band-green/15 dark:text-band-green",
  yellow:
    "bg-band-yellow-soft text-band-yellow dark:bg-band-yellow/15 dark:text-band-yellow",
  red: "bg-band-red-soft text-band-red dark:bg-band-red/15 dark:text-band-red",
  neutral:
    "bg-paper-border/60 text-paper-text-muted dark:bg-ink-border/60 dark:text-ink-text-muted",
  primary: "bg-primary/10 text-primary",
};

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        TONE_STYLES[tone],
        className
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}
