import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@lore/utils";

export default function MarketingPage() {
  const t = useTranslations("Marketing");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white">
      <h1 className="text-5xl font-light tracking-tight text-[#17171c]">{t("title")}</h1>
      <p className="mt-4 text-lg text-[#616161]">{t("tagline")}</p>
      <Link
        href={ROUTES.signUp}
        className="mt-8 inline-flex items-center justify-center rounded-full bg-[#17171c] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#17171c]/90"
      >
        {t("cta")}
      </Link>
    </main>
  );
}
