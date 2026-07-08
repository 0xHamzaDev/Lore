"use client";

import { useTranslations } from "next-intl";
import { Button, ErrorState } from "@lore/ui";

export default function SettingsError({ reset }: { reset: () => void }) {
  const t = useTranslations("Common");

  return (
    <ErrorState
      title={t("error")}
      description={t("errorDescription")}
      action={
        <Button variant="outline" size="sm" onClick={reset}>
          {t("retry")}
        </Button>
      }
    />
  );
}
