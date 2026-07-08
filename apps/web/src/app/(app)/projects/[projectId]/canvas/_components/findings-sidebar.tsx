"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button, Skeleton } from "@lore/ui";
import { QK } from "@lore/utils";
import { dismissFinding } from "../_findings-actions";
import {
  useFindings,
  type FindingRow,
  type Severity,
} from "../_hooks/use-findings";
import { FindingsUpgradeCard } from "./findings-upgrade-card";

const DOT: Record<Severity, string> = {
  error: "bg-[#dc2626]",
  warning: "bg-[#f59e0b]",
  info: "bg-[#3b82f6]",
};

const AGENT_TKEY: Record<FindingRow["agentType"], string> = {
  continuity: "agentContinuity",
  pacing: "agentPacing",
  dialogue: "agentDialogue",
  verification: "agentVerification",
};

const SEVERITY_ORDER: Severity[] = ["error", "warning", "info"];

const SEVERITY_HEADING: Record<Severity, string> = {
  error: "errors",
  warning: "warnings",
  info: "info",
};

interface FindingsSidebarProps {
  projectId: string;
  branchId: string;
  open: boolean;
  onClose: () => void;
}

export function FindingsSidebar({
  projectId,
  branchId,
  open,
  onClose,
}: FindingsSidebarProps) {
  const t = useTranslations("CanvasFindings");
  const { data, isLoading } = useFindings(projectId, branchId);
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  const findings = data?.findings ?? [];
  const groups: Record<Severity, FindingRow[]> = {
    error: [],
    warning: [],
    info: [],
  };
  for (const f of findings) groups[f.severity].push(f);

  const onDismiss = (id: string) =>
    startTransition(async () => {
      const out = await dismissFinding({ findingId: id });
      if (!out.success) {
        toast.error(t("dismissError"));
        return;
      }
      toast.success(t("dismissed"));
      void queryClient.invalidateQueries({
        queryKey: QK.findings.list(projectId, branchId),
      });
    });

  return (
    <aside className="absolute inset-y-0 end-0 z-20 flex w-[420px] flex-col border-s border-[#d9d9dd] bg-white shadow-lg">
      <header className="flex items-center justify-between border-b border-[#d9d9dd] px-4 py-3">
        <h2 className="text-sm font-semibold text-[#17171c]">
          {t("sidebarTitle")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("close")}
          title={t("close")}
          onClick={onClose}
          className="h-7 w-7"
        >
          <X size={14} />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {data?.freeTeaser ? (
          <FindingsUpgradeCard />
        ) : isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : findings.length === 0 ? (
          <p className="text-sm text-[#93939f]">{t("empty")}</p>
        ) : (
          <div className="space-y-4">
            {SEVERITY_ORDER.map((sev) =>
              groups[sev].length === 0 ? null : (
                <section key={sev}>
                  <h3 className="mb-2 text-xs uppercase tracking-wide text-[#93939f]">
                    {t(SEVERITY_HEADING[sev])}
                  </h3>
                  <ul className="space-y-2">
                    {groups[sev].map((f) => (
                      <li
                        key={f.id}
                        className="flex items-start gap-3 rounded-md border border-[#d9d9dd] p-3"
                      >
                        <span
                          className={`mt-1 h-2 w-2 shrink-0 rounded-full ${DOT[f.severity]}`}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-[#93939f]">
                            {t(AGENT_TKEY[f.agentType])}
                          </p>
                          <p className="text-sm text-[#17171c]">{f.message}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() => onDismiss(f.id)}
                        >
                          {t("dismiss")}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              ),
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
