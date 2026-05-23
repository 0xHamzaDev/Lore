"use client";
import { useLocale } from "next-intl";
import { cn } from "@lore/ui";

interface LocaleSwitcherProps {
  className?: string;
  variant?: "default" | "footer";
}

export function LocaleSwitcher({ className, variant = "default" }: LocaleSwitcherProps) {
  const locale = useLocale();

  function toggle() {
    const next = locale === "ar" ? "en" : "ar";
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    window.location.reload();
  }

  const styles =
    variant === "footer"
      ? "text-xs text-product-dark-muted hover:text-muted"
      : "rounded-xs px-2.5 py-1.5 text-xs font-medium text-body-muted hover:bg-soft-stone hover:text-primary";

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn("transition-colors", styles, className)}
      aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
    >
      {locale === "ar" ? "EN" : "عربي"}
    </button>
  );
}
