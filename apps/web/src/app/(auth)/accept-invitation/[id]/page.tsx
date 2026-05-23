"use client";
import { use, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { ROUTES } from "@lore/utils";
import { Button } from "@lore/ui";
import { toast } from "sonner";

export default function AcceptInvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("Auth");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleAccept() {
    setPending(true);
    const result = await authClient.organization.acceptInvitation({ invitationId: id });
    if ((result as { error?: unknown }).error) {
      toast.error(t("errors.generic"));
      setPending(false);
      return;
    }
    router.push(ROUTES.dashboard);
  }

  return (
    <div className="rounded-lg border border-border-light bg-canvas p-8 sm:p-10">
      <div className="flex flex-col gap-1.5 pb-6">
        <h1 className="text-2xl font-medium tracking-tight text-primary">{t("acceptTitle")}</h1>
        <p className="text-sm text-body-muted">{t("acceptSignUpHint")}</p>
      </div>

      <Button type="button" onClick={handleAccept} disabled={pending} className="w-full">
        {pending ? t("accepting") : t("acceptCta")}
      </Button>
    </div>
  );
}
