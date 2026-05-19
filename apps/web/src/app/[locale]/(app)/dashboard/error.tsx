"use client";
import { useTranslations } from "next-intl";
import { Button } from "@lore/ui";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("Common");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <p className="text-sm text-[#b30000]">{t("error")}</p>
      <Button variant="outline" onClick={reset} size="sm">
        {t("retry")}
      </Button>
    </div>
  );
}
