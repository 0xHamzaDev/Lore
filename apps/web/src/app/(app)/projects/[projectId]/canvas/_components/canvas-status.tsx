"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useFindings } from "../_hooks/use-findings";

// Reads runStatus piggy-backed on the findings poll. Spinner-text while a run is
// in flight; one-shot toast when completedAt transitions from null to a value.
export function CanvasStatus({
  projectId,
  branchId,
}: {
  projectId: string;
  branchId: string;
}) {
  const t = useTranslations("CanvasFindings");
  const { data } = useFindings(projectId, branchId);
  const prev = useRef<string | null>(null);

  useEffect(() => {
    const completedAt = data?.runStatus?.completedAt ?? null;
    if (completedAt && completedAt !== prev.current) {
      toast.success(t("runComplete", { count: data?.findings.length ?? 0 }));
    }
    prev.current = completedAt;
  }, [data?.runStatus?.completedAt, data?.findings.length, t]);

  const running = Boolean(
    data?.runStatus?.startedAt && !data?.runStatus?.completedAt,
  );
  if (!running) return null;
  return <span className="text-xs text-[#93939f]">{t("runRunning")}</span>;
}
