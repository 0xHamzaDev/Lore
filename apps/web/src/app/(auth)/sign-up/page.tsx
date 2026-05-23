import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@lore/utils";
import { SignUpForm } from "./_components/sign-up-form";

export const metadata = { title: "Create account — Lore" };

export default function SignUpPage() {
  const t = useTranslations("Auth");

  return (
    <div className="rounded-lg border border-border-light bg-canvas p-8 sm:p-10">
      <div className="flex flex-col gap-1.5 pb-6">
        <h1 className="text-2xl font-medium tracking-tight text-primary">{t("signUpTitle")}</h1>
        <p className="text-sm text-body-muted">{t("signUpSubtitle")}</p>
      </div>

      <SignUpForm />

      <div className="mt-6 border-t border-border-light pt-5 text-center text-sm text-body-muted">
        {t("hasAccount")}{" "}
        <Link
          href={ROUTES.signIn}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("signIn")}
        </Link>
      </div>
    </div>
  );
}
