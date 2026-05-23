"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@lore/utils";
import { Menu, X } from "lucide-react";

export function MarketingNav() {
  const t = useTranslations("Marketing");
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border-light bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link
          href={ROUTES.home}
          className="font-display text-2xl italic font-light tracking-tight text-primary"
        >
          {t("title")}
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-sm text-body-muted transition-colors hover:text-primary"
          >
            {t("nav.features")}
          </a>
          <a
            href="#entities"
            className="text-sm text-body-muted transition-colors hover:text-primary"
          >
            {t("nav.pricing")}
          </a>
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <Link
            href={ROUTES.signIn}
            className="text-sm text-body-muted transition-colors hover:text-primary"
          >
            {t("nav.signIn")}
          </Link>
          <Link
            href={ROUTES.signUp}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-canvas transition-colors hover:bg-primary/90"
          >
            {t("nav.getStarted")}
          </Link>
        </div>

        <button
          className="flex items-center justify-center rounded-xs p-2 text-body-muted transition-colors hover:text-primary md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-border-light bg-canvas px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            <a href="#features" className="text-sm text-body-muted" onClick={() => setOpen(false)}>
              {t("nav.features")}
            </a>
            <a href="#entities" className="text-sm text-body-muted" onClick={() => setOpen(false)}>
              {t("nav.pricing")}
            </a>
            <hr className="border-border-light" />
            <Link href={ROUTES.signIn} className="text-sm text-body-muted">
              {t("nav.signIn")}
            </Link>
            <Link
              href={ROUTES.signUp}
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-canvas"
            >
              {t("nav.getStarted")}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
