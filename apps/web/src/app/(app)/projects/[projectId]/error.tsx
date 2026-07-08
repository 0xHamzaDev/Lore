"use client";

import { useTranslations } from "next-intl";
import { Button, ErrorState } from "@lore/ui";
import { useRouter } from "@/i18n/navigation";
import { ROUTES } from "@lore/utils";

export default function ProjectError({ reset }: { reset: () => void }) {
  const t = useTranslations("Common");
  const router = useRouter();

  return (
    <div className="flex h-dvh w-full items-center justify-center p-6">
      <ErrorState
        title={t("error")}
        description={t("errorDescription")}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reset}>
              {t("retry")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(ROUTES.dashboard)}
            >
              {t("back")}
            </Button>
          </div>
        }
      />
    </div>
  );
}
