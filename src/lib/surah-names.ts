import { getSurahInfo } from "quran-meta/hafs";
import type { Surah } from "quran-meta/hafs";

export interface SurahOption {
  number: number;
  name: string;
}

/** All 114 surah names in canonical (mus-hafi) order, for the End Surah
 * picker. Sourced from quran-meta rather than typed by hand - 114 names is
 * exactly the kind of dataset a single typo slips into unnoticed. */
export const SURAH_OPTIONS: SurahOption[] = Array.from(
  { length: 114 },
  (_, i) => {
    const number = i + 1;
    const [, , , , name] = getSurahInfo(number as Surah);
    return { number, name };
  }
);

export function surahName(number: number): string {
  return SURAH_OPTIONS[number - 1]?.name ?? `سورة ${number}`;
}
