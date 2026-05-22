"use client";

import { useTranslations } from "next-intl";
import { Button } from "@lore/ui";

export default function DashboardError({ reset }: { reset: () => void }) {
  const t = useTranslations("Common");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-sm text-[#93939f]">{t("error")}</p>
      <Button variant="outline" size="sm" onClick={reset}>
        {t("retry")}
      </Button>
    </div>
  );
}
