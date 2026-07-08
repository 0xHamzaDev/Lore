import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { ResetPasswordForm } from "./_components/reset-password-form";

export const metadata = { title: "Set a new password — Lore" };

export default function ResetPasswordPage() {
  const t = useTranslations("Auth");

  return (
    <div className="rounded-lg border border-border-light bg-canvas p-8 sm:p-10">
      <div className="flex flex-col gap-1.5 pb-6">
        <h1 className="text-2xl font-medium tracking-tight text-primary">
          {t("resetPasswordTitle")}
        </h1>
        <p className="text-sm text-body-muted">{t("resetPasswordSubtitle")}</p>
      </div>

      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
