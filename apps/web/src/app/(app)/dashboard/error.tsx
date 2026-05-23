"use client";

import { useTranslations } from "next-intl";
import { Button, ErrorState } from "@lore/ui";

export default function DashboardError({ reset }: { reset: () => void }) {
  const t = useTranslations();

  return (
    <div className="flex flex-1 items-center justify-center p-6 lg:p-10">
      <ErrorState
        title={t("Dashboard.loadFailed")}
        description={t("Dashboard.loadFailedDescription")}
        action={
          <Button variant="outline" size="sm" onClick={reset}>
            {t("Common.retry")}
          </Button>
        }
      />
    </div>
  );
}
