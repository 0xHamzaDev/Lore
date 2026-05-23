"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ROUTES } from "@lore/utils";
import { cn } from "@lore/ui";

const TABS = [
  { labelKey: "Settings.tabs.profile" as const, href: ROUTES.settings.profile },
  { labelKey: "Settings.tabs.org" as const, href: ROUTES.settings.org },
];

export function SettingsTabs() {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <nav
      role="tablist"
      aria-label="Settings"
      className="flex items-center gap-1 border-b border-border-light"
    >
      {TABS.map(({ labelKey, href }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "relative inline-flex h-9 items-center px-3 text-sm transition-colors",
              isActive ? "text-primary font-medium" : "text-body-muted hover:text-primary",
            )}
          >
            {t(labelKey)}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-x-2 -bottom-px h-px transition-colors",
                isActive ? "bg-primary" : "bg-transparent",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
