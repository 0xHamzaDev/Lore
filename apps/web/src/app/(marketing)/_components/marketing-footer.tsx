"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@lore/utils";

export function MarketingFooter() {
  const t = useTranslations("Marketing");

  return (
    <footer className="border-t border-border-light bg-primary">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-3 font-mono text-xs uppercase tracking-widest text-coral">
          {t("footer.newsletter.label")}
        </div>
        <h3 className="font-display text-3xl italic font-light text-canvas">
          {t("footer.newsletter.heading")}
        </h3>
        <form className="mt-6 flex max-w-sm gap-2" onSubmit={(e) => e.preventDefault()}>
          <input
            type="email"
            placeholder={t("footer.newsletter.placeholder")}
            className="flex-1 rounded-xs border border-product-dark-border bg-product-dark px-4 py-2.5 text-sm text-canvas placeholder:text-product-dark-muted focus:border-focus-blue focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-canvas px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-soft-stone"
          >
            {t("footer.newsletter.submit")}
          </button>
        </form>
      </div>

      <div className="border-t border-product-dark-border">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            <div>
              <span className="font-display text-xl italic font-light text-canvas">
                {t("title")}
              </span>
              <p className="mt-2 text-sm text-body-muted">{t("tagline")}</p>
            </div>

            <div>
              <div className="mb-4 font-mono text-xs uppercase tracking-widest text-muted">
                {t("footer.product")}
              </div>
              <ul className="flex flex-col gap-3">
                {(["features", "pricing", "changelog"] as const).map((key) => (
                  <li key={key}>
                    <a
                      href="#"
                      className="text-sm text-body-muted transition-colors hover:text-canvas"
                    >
                      {t(`footer.links.${key}`)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="mb-4 font-mono text-xs uppercase tracking-widest text-muted">
                {t("footer.company")}
              </div>
              <ul className="flex flex-col gap-3">
                {(["about", "blog", "careers"] as const).map((key) => (
                  <li key={key}>
                    <a
                      href="#"
                      className="text-sm text-body-muted transition-colors hover:text-canvas"
                    >
                      {t(`footer.links.${key}`)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-product-dark-border pt-8 md:flex-row md:items-center">
            <p className="text-xs text-product-dark-muted">{t("footer.legal")}</p>
            <div className="flex gap-6">
              <a
                href="#"
                className="text-xs text-product-dark-muted transition-colors hover:text-muted"
              >
                {t("footer.privacy")}
              </a>
              <a
                href="#"
                className="text-xs text-product-dark-muted transition-colors hover:text-muted"
              >
                {t("footer.terms")}
              </a>
              <Link
                href={ROUTES.signIn}
                className="text-xs text-product-dark-muted transition-colors hover:text-muted"
              >
                {t("nav.signIn")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
