"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@lore/ui";

const LOCALES = [
  { value: "ar", labelKey: "languageArabic" as const, dir: "rtl" },
  { value: "en", labelKey: "languageEnglish" as const, dir: "ltr" },
];

export function LanguageForm() {
  const t = useTranslations("Settings.profile");
  const locale = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();

  function setLocale(next: string) {
    if (next === locale) return;
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-primary">{t("language")}</span>
      <div className="inline-flex w-fit overflow-hidden rounded-sm border border-border-light">
        {LOCALES.map(({ value, labelKey, dir }) => {
          const isActive = locale === value;
          return (
            <button
              key={value}
              type="button"
              dir={dir}
              onClick={() => setLocale(value)}
              aria-pressed={isActive}
              className={cn(
                "px-4 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-primary text-canvas"
                  : "text-body-muted hover:bg-soft-stone hover:text-primary",
              )}
            >
              {t(labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
