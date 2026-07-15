import type { Surah, AyahNo } from "quran-meta/hafs";
import {
  findAyahIdBySurah,
  findRubAlHizb,
  getRubAlHizbMeta,
  nextAyah as quranNextAyah,
  getAyahCountInSurah,
  checkValidSurahAyah,
} from "quran-meta/hafs";

const TOTAL_AYAHS_HAFS = 6236;

export interface SurahAyah {
  surah: number;
  ayah: number;
}

export interface NextStartPoint extends SurahAyah {
  /** True if last week's End Surah/Ayah was 114:6 - the student finished
   * the whole Quran. The caller should surface this rather than silently
   * restart at 1:1 (quran-meta's own nextAyah() wraps around silently,
   * which is fine for a "next ayah in recitation order" utility but wrong
   * for a memorization tracker with no idea it just hit a khatm). */
  completedQuran: boolean;
}

/**
 * Validates a (surah, ayah) pair against real Hafs data and returns it
 * narrowed to quran-meta's branded Surah/AyahNo types. Every function below
 * routes plain DB integers through this once, single choke point instead of
 * casting ad hoc, so "we validated this" and "we're allowed to use it as a
 * Surah/AyahNo" can never drift apart.
 *
 * Throws if surah is outside 1-114 or ayah is outside 1-(ayah count of that
 * surah) - e.g. a mistyped End Ayah past the end of its Surah.
 */
function toValidSurahAyah(surah: number, ayah: number): [Surah, AyahNo] {
  checkValidSurahAyah(surah, ayah);
  return [surah as Surah, ayah as AyahNo];
}

export function assertValidSurahAyah(surah: number, ayah: number): void {
  toValidSurahAyah(surah, ayah);
}

export function ayahCountInSurah(surah: number): number {
  return getAyahCountInSurah(surah as Surah);
}

/**
 * Continuous position on a 0..480 "ithman" (eighth-of-a-hizb) scale.
 *
 * Hafs Mushafs mark 240 Rub' al-Hizb (quarter-hizb) boundaries - real,
 * verified structural data (see the quran-meta package this is built on).
 * They do NOT mark eighths: Thumun al-Hizb is a Qalun-riwaya convention,
 * not a printed Hafs marking (quran-meta's own Hafs metadata reports
 * numThumunAlHizbs = 0).
 *
 * "Ithman" here follows a teaching convention many halaqat already use
 * informally: each of the 240 real quarters, split at its ayah-count
 * midpoint into two eighths. That midpoint split is an approximation
 * (a quarter's ayahs aren't perfectly uniform in length) - but the error
 * is bounded to within a single quarter, not compounded across the Quran,
 * since the 240 quarter boundaries themselves are exact.
 */
function ithmanPosition(surah: Surah, ayah: AyahNo): number {
  const ayahId = findAyahIdBySurah(surah, ayah);
  const rub = findRubAlHizb(surah, ayah);
  const { firstAyahId, lastAyahId } = getRubAlHizbMeta(rub);
  const quarterLength = lastAyahId - firstAyahId + 1;
  const fractionThroughQuarter = (ayahId - firstAyahId) / quarterLength;
  return (rub - 1) * 2 + fractionThroughQuarter * 2;
}

/**
 * Ithman memorized between two points, INCLUSIVE of the end ayah.
 * Fractional, so a partial eighth still counts as a partial value and the
 * red/yellow/green bands stay meaningful for a student who stops mid-segment.
 *
 * Throws if the end point comes before the start point (e.g. a typo'd
 * End Surah/Ayah that's earlier in the Quran than the locked Start point).
 */
export function calculateIthmanCount(
  startSurah: number,
  startAyah: number,
  endSurah: number,
  endAyah: number
): number {
  const [vStartSurah, vStartAyah] = toValidSurahAyah(startSurah, startAyah);
  const [vEndSurah, vEndAyah] = toValidSurahAyah(endSurah, endAyah);

  const startAyahId = findAyahIdBySurah(vStartSurah, vStartAyah);
  const endAyahId = findAyahIdBySurah(vEndSurah, vEndAyah);

  if (endAyahId < startAyahId) {
    throw new RangeError(
      "End Surah/Ayah must come after the (locked) Start Surah/Ayah."
    );
  }

  const startPos = ithmanPosition(vStartSurah, vStartAyah);

  // +1 ayah's worth of credit so the end ayah is fully included, not just
  // "covered up to the start of."
  const endRub = findRubAlHizb(vEndSurah, vEndAyah);
  const { firstAyahId: endFirst, lastAyahId: endLast } =
    getRubAlHizbMeta(endRub);
  const endQuarterLength = endLast - endFirst + 1;
  const endPos =
    (endRub - 1) * 2 + ((endAyahId - endFirst + 1) / endQuarterLength) * 2;

  return Math.round((endPos - startPos) * 100) / 100;
}

/**
 * Locks in next week's Start Surah/Ayah from this week's End Surah/Ayah.
 * Rolls over to the next surah automatically.
 */
export function nextStartPoint(
  lastEndSurah: number,
  lastEndAyah: number
): NextStartPoint {
  const [vSurah, vAyah] = toValidSurahAyah(lastEndSurah, lastEndAyah);

  const lastAyahId = findAyahIdBySurah(vSurah, vAyah);
  if (lastAyahId >= TOTAL_AYAHS_HAFS) {
    return { surah: 1, ayah: 1, completedQuran: true };
  }

  const [surah, ayah] = quranNextAyah(vSurah, vAyah);
  return { surah, ayah, completedQuran: false };
}

/** Red / Yellow / Green banding, kept as a pure function of ithmanCount
 * (not stored in the DB) so the thresholds can be tuned without a
 * migration. Matches the spec's own math: 8 ithman = 1 hizb. */
export type IthmanBand = "RED" | "YELLOW" | "GREEN";

export function ithmanBand(ithmanCount: number): IthmanBand {
  if (ithmanCount < 4) return "RED";
  if (ithmanCount <= 10) return "YELLOW";
  return "GREEN";
}
