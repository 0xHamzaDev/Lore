import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@lore/utils";

export function MarketingFooter() {
  const t = useTranslations("Marketing");

  return (
    <footer className="border-t border-border-light bg-primary">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <div>
            <span className="font-display text-xl italic font-light text-canvas">
              {t("title")}
            </span>
            <p className="mt-2 max-w-xs text-sm text-body-muted">
              {t("tagline")}
            </p>
          </div>

          <div className="md:justify-self-end">
            <div className="mb-4 font-mono text-xs uppercase tracking-widest text-muted">
              {t("footer.product")}
            </div>
            <ul className="flex flex-col gap-3">
              <li>
                <Link
                  href="/#features"
                  className="text-sm text-body-muted transition-colors hover:text-canvas"
                >
                  {t("footer.links.features")}
                </Link>
              </li>
              <li>
                <Link
                  href="/#pricing"
                  className="text-sm text-body-muted transition-colors hover:text-canvas"
                >
                  {t("footer.links.pricing")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-product-dark-border pt-8 md:flex-row md:items-center">
          <p className="text-xs text-product-dark-muted">{t("footer.legal")}</p>
          <div className="flex flex-wrap gap-6">
            <Link
              href={ROUTES.privacy}
              className="text-xs text-product-dark-muted transition-colors hover:text-muted"
            >
              {t("footer.privacy")}
            </Link>
            <Link
              href={ROUTES.terms}
              className="text-xs text-product-dark-muted transition-colors hover:text-muted"
            >
              {t("footer.terms")}
            </Link>
            <Link
              href={ROUTES.signIn}
              className="text-xs text-product-dark-muted transition-colors hover:text-muted"
            >
              {t("nav.signIn")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
