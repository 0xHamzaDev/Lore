import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@lore/utils";
import { SignInForm } from "./_components/sign-in-form";

export default function SignInPage() {
  const t = useTranslations("Auth");

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-light tracking-tight text-[#17171c]">{t("signIn")}</h1>
      </div>
      <SignInForm />
      <p className="text-center text-sm text-[#93939f]">
        {t("noAccount")}{" "}
        <Link href={ROUTES.signUp} className="text-[#1863dc] hover:underline">
          {t("signUp")}
        </Link>
      </p>
    </div>
  );
}
