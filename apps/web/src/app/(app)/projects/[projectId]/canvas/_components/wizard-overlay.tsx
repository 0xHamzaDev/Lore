"use client";

import { useTranslations } from "next-intl";
import { Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@lore/ui";
import type { WizardStreamStatus } from "../_hooks/use-wizard-stream";

interface WizardOverlayProps {
  status: WizardStreamStatus;
  count: number;
  onRetry: () => void;
  onDismiss: () => void;
}

export function WizardOverlay({
  status,
  count,
  onRetry,
  onDismiss,
}: WizardOverlayProps) {
  const t = useTranslations("Wizard");

  if (status === "idle" || status === "done") return null;

  const isError = status === "error";
  const canRetry = isError && count === 0;

  return (
    <div className="absolute inset-0 z-[300] flex items-center justify-center bg-black/30">
      <div className="w-[360px] rounded-2xl border border-[#d9d9dd] bg-white p-6 text-center shadow-lg">
        {!isError ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#003c33]/10">
              <Sparkles className="h-6 w-6 animate-pulse text-[#003c33]" />
            </div>
            <h2 className="text-base font-semibold text-[#17171c]">
              {t("generatingTitle")}
            </h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              {t("generatingCount", { count })}
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <h2 className="text-base font-semibold text-[#17171c]">
              {t("errorTitle")}
            </h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              {count > 0 ? t("errorPartial", { count }) : t("errorEmpty")}
            </p>
            <div className="mt-5 flex justify-center gap-2">
              {canRetry && (
                <Button type="button" onClick={onRetry}>
                  {t("tryAgain")}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onDismiss}>
                {count > 0 ? t("keepAndClose") : t("backToDashboard")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
