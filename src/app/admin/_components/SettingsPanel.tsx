"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Palette, Check } from "lucide-react";
import { FormInput } from "@/components/shared/FormInput";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { updateSettings } from "@/lib/actions/settings";
import type { CampSettings } from "@/lib/settings-data";

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function SettingsPanel({ initial }: { initial: CampSettings }) {
  const router = useRouter();
  const [campName, setCampName] = useState(initial.campName);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? "");
  const [welcomeText, setWelcomeText] = useState(initial.welcomeText ?? "");
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isValidColor = HEX_PATTERN.test(primaryColor);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!isValidColor) {
      setError("اللون يجب أن يكون بصيغة hex مثل ‎#0f766e‎.");
      return;
    }

    startTransition(async () => {
      const result = await updateSettings({
        campName,
        logoUrl,
        welcomeText,
        primaryColor,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSaved(true);
      // Re-renders the layout with the fresh settings - the sidebar logo/
      // name and the --primary CSS variable all read from the same
      // getSettings() call, so this one refresh is what makes a branding
      // change show up across the whole system, not just this form.
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-paper-border bg-paper-surface p-5 dark:border-ink-border dark:bg-ink-surface">
      <div className="mb-4 flex items-center gap-2">
        <Palette className="size-4 text-paper-text-muted dark:text-ink-text-muted" />
        <h2 className="font-medium text-paper-text dark:text-ink-text">
          إعدادات المخيم
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="اسم المخيم"
            value={campName}
            onChange={(e) => setCampName(e.target.value)}
            required
          />
          <FormInput
            label="رابط الشعار (اختياري)"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            dir="ltr"
            placeholder="https://..."
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="welcome-text"
            className="text-sm font-medium text-paper-text dark:text-ink-text"
          >
            نص الترحيب في صفحة الدخول (اختياري)
          </label>
          <textarea
            id="welcome-text"
            value={welcomeText}
            onChange={(e) => setWelcomeText(e.target.value)}
            rows={2}
            className="rounded-lg border border-paper-border bg-paper-surface px-3 py-2.5 text-sm text-paper-text outline-none focus:border-primary dark:border-ink-border dark:bg-ink-surface dark:text-ink-text"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="primary-color"
            className="text-sm font-medium text-paper-text dark:text-ink-text"
          >
            اللون الأساسي للنظام
          </label>
          <div className="flex items-center gap-2">
            <input
              id="primary-color-swatch"
              type="color"
              value={isValidColor ? primaryColor : "#0f766e"}
              onChange={(e) => setPrimaryColor(e.target.value)}
              aria-label="اختيار اللون"
              className="size-10 shrink-0 cursor-pointer rounded-lg border border-paper-border bg-transparent dark:border-ink-border"
            />
            <input
              id="primary-color"
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              dir="ltr"
              placeholder="#0f766e"
              className="flex-1 rounded-lg border border-paper-border bg-paper-surface px-3 py-2.5 text-sm text-paper-text outline-none focus:border-primary dark:border-ink-border dark:bg-ink-surface dark:text-ink-text"
            />
          </div>
          {!isValidColor && (
            <p className="text-xs text-band-red">
              يجب أن يكون بصيغة hex من 6 خانات، مثل ‎#0f766e‎
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-band-red-soft px-3 py-2 text-sm text-band-red dark:bg-band-red/15">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <SubmitButton isPending={isPending}>حفظ الإعدادات</SubmitButton>
          {saved && !isPending && (
            <span className="flex items-center gap-1 text-sm text-band-green">
              <Check className="size-4" />
              تم الحفظ
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
