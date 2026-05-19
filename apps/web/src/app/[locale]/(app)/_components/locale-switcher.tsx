"use client";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function toggle() {
    router.replace(pathname, { locale: locale === "ar" ? "en" : "ar" });
  }

  return (
    <button
      onClick={toggle}
      className="rounded-sm px-2 py-1 text-xs font-medium text-[#93939f] hover:bg-[#eeece7] hover:text-[#212121] transition-colors"
    >
      {locale === "ar" ? "EN" : "عربي"}
    </button>
  );
}
