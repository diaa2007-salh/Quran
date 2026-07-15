"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { CustomModal } from "@/components/shared/CustomModal";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { IthmanMeter } from "@/components/shared/IthmanMeter";
import {
  getWeeklyMemorizationEntry,
  recordWeeklyMemorization,
} from "@/lib/actions/memorization";
import { ayahCountInSurah, type IthmanBand } from "@/lib/quran";
import { SURAH_OPTIONS, surahName } from "@/lib/surah-names";

type EntryState = {
  startSurah: number;
  startAyah: number;
  endSurah: number | null;
  endAyah: number | null;
  ithmanCount: number | null;
  band: IthmanBand | null;
  completedQuranLastWeek?: boolean;
} | null;

export function MemorizationEntryButton({
  studentId,
  studentName,
  weekStart,
  isRecorded,
}: {
  studentId: string;
  studentName: string;
  weekStart: string;
  isRecorded: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, startLoading] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [entry, setEntry] = useState<EntryState>(null);
  const [endSurah, setEndSurah] = useState<number | "">("");
  const [endAyah, setEndAyah] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const [savedResult, setSavedResult] = useState<{
    ithmanCount: number;
    band: IthmanBand;
  } | null>(null);

  function open() {
    setIsOpen(true);
    setError(null);
    setSavedResult(null);
    startLoading(async () => {
      const result = await getWeeklyMemorizationEntry(studentId, weekStart);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setEntry(result);
      setEndSurah(result.endSurah ?? "");
      setEndAyah(result.endAyah ?? "");
    });
  }

  function close() {
    if (isSaving) return;
    setIsOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (endSurah === "" || endAyah === "") {
      setError("أدخل السورة والآية.");
      return;
    }
    setError(null);
    startSaving(async () => {
      const result = await recordWeeklyMemorization({
        studentId,
        weekStart,
        endSurah: Number(endSurah),
        endAyah: Number(endAyah),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSavedResult(result);
      router.refresh();
    });
  }

  const maxAyah = endSurah !== "" ? ayahCountInSurah(Number(endSurah)) : undefined;

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
      >
        {isRecorded ? "تعديل" : "تسجيل"}
      </button>

      <CustomModal isOpen={isOpen} onClose={close} title={studentName}>
        {isLoading ? (
          <p className="py-6 text-center text-sm text-paper-text-muted dark:text-ink-text-muted">
            جارٍ التحميل...
          </p>
        ) : savedResult ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Sparkles className="size-8 text-primary" />
            <p className="text-sm text-paper-text dark:text-ink-text">
              تم الحفظ بنجاح
            </p>
            <IthmanMeter
              ithmanCount={savedResult.ithmanCount}
              band={savedResult.band}
            />
            <button
              type="button"
              onClick={close}
              className="mt-2 text-sm font-medium text-primary hover:underline"
            >
              إغلاق
            </button>
          </div>
        ) : (
          entry && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {entry.completedQuranLastWeek && (
                <p className="rounded-lg bg-band-green-soft px-3 py-2 text-sm text-band-green dark:bg-band-green/15">
                  🎉 أتمّ هذا التلميذ ختم القرآن الأسبوع الماضي! بدأنا من جديد
                  من الفاتحة.
                </p>
              )}

              <div>
                <p className="mb-1.5 text-sm font-medium text-paper-text dark:text-ink-text">
                  بداية هذا الأسبوع (مُقفَلة تلقائيًا)
                </p>
                <p className="rounded-lg border border-paper-border bg-paper/60 px-3 py-2.5 text-sm text-paper-text-muted dark:border-ink-border dark:bg-ink/40 dark:text-ink-text-muted">
                  {surahName(entry.startSurah)} - آية {entry.startAyah}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="end-surah"
                    className="text-sm font-medium text-paper-text dark:text-ink-text"
                  >
                    نهاية السورة
                  </label>
                  <select
                    id="end-surah"
                    value={endSurah}
                    onChange={(e) => setEndSurah(Number(e.target.value))}
                    className="rounded-lg border border-paper-border bg-paper-surface px-3 py-2.5 text-sm text-paper-text outline-none focus:border-primary dark:border-ink-border dark:bg-ink-surface dark:text-ink-text"
                  >
                    <option value="" disabled>
                      اختر السورة
                    </option>
                    {SURAH_OPTIONS.map((s) => (
                      <option key={s.number} value={s.number}>
                        {s.number}. {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="end-ayah"
                    className="text-sm font-medium text-paper-text dark:text-ink-text"
                  >
                    نهاية الآية
                  </label>
                  <input
                    id="end-ayah"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={maxAyah}
                    value={endAyah}
                    onChange={(e) =>
                      setEndAyah(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="rounded-lg border border-paper-border bg-paper-surface px-3 py-2.5 text-sm text-paper-text outline-none focus:border-primary dark:border-ink-border dark:bg-ink-surface dark:text-ink-text"
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-band-red-soft px-3 py-2 text-sm text-band-red dark:bg-band-red/15">
                  {error}
                </p>
              )}

              <div className="flex justify-end">
                <SubmitButton isPending={isSaving}>حفظ</SubmitButton>
              </div>
            </form>
          )
        )}
      </CustomModal>
    </>
  );
}
