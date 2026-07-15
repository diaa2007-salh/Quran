import { cn } from "@/lib/cn";
import type { IthmanBand } from "@/lib/quran";

const BAND_FILL: Record<IthmanBand, string> = {
  RED: "bg-band-red",
  YELLOW: "bg-band-yellow",
  GREEN: "bg-band-green",
};

const BAND_LABEL_AR: Record<IthmanBand, string> = {
  RED: "أقل من نصف حزب",
  YELLOW: "بين نصف حزب وحزب وربع",
  GREEN: "أكثر من حزب وربع",
};

/**
 * Renders ithmanCount as filled segments out of 8 (one hizb = 8 ithman),
 * not a generic 0-100% bar - the meter's own shape is the unit being
 * measured. A count above 8 (more than one hizb memorized in a week)
 * fills all 8 and adds a "+N" chip rather than wrapping, which would
 * misread as "started over."
 */
export function IthmanMeter({
  ithmanCount,
  band,
  className,
}: {
  ithmanCount: number | null;
  band: IthmanBand | null;
  className?: string;
}) {
  if (ithmanCount === null || band === null) {
    return (
      <span
        className={cn(
          "text-xs text-paper-text-muted dark:text-ink-text-muted",
          className
        )}
      >
        لم يُسجَّل بعد
      </span>
    );
  }

  const filled = Math.min(8, Math.round(ithmanCount));
  const overflow = ithmanCount > 8 ? Math.round((ithmanCount - 8) * 10) / 10 : 0;

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="img"
      aria-label={`${ithmanCount} ثمن، ${BAND_LABEL_AR[band]}`}
    >
      <div className="flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-4 w-1.5 rounded-full",
              i < filled
                ? BAND_FILL[band]
                : "bg-paper-border dark:bg-ink-border"
            )}
          />
        ))}
      </div>
      <span className="font-[var(--font-data)] text-xs tabular-nums text-paper-text-muted dark:text-ink-text-muted">
        {ithmanCount}
        {overflow > 0 && <span className="text-primary"> +{overflow}</span>}
      </span>
    </div>
  );
}
