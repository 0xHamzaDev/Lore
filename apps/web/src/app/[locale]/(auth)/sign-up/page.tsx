import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@lore/utils";
import { SignUpForm } from "./_components/sign-up-form";

export default function SignUpPage() {
  const t = useTranslations("Auth");

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-light tracking-tight text-[#17171c]">{t("signUp")}</h1>
      </div>
      <SignUpForm />
      <p className="text-center text-sm text-[#93939f]">
        {t("hasAccount")}{" "}
        <Link href={ROUTES.signIn} className="text-[#1863dc] hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
