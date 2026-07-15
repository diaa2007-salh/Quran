/**
 * Locks a date to the most recent Saturday. ASSUMPTION worth confirming:
 * many halaqat run Sat-Thu, but this is a one-line change if your camp's
 * week starts on Sunday or Friday instead.
 */
export function startOfWeek(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = d.getUTCDay(); // 0 = Sunday ... 6 = Saturday
  const diff = (day + 1) % 7; // days since the most recent Saturday
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

export function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function currentWeekStartString(): string {
  return toDateOnlyString(startOfWeek(new Date()));
}

export function todayDateString(): string {
  return toDateOnlyString(new Date());
}
