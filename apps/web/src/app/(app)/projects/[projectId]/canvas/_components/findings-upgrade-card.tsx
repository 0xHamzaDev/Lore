"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@lore/ui";
import { UpgradeModal } from "@/components/upgrade-modal";

// Static teaser for free orgs — no live count (Inngest skips free orgs, so
// there are zero findings to count). Reuses the Phase 5 UpgradeModal, which
// takes `open` + `onClose` (not `onOpenChange`).
export function FindingsUpgradeCard() {
  const t = useTranslations("CanvasFindings");
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-6">
      <h3 className="text-base font-medium">{t("upgradeTitle")}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{t("upgradeBody")}</p>
      <Button className="mt-4" size="sm" onClick={() => setOpen(true)}>
        {t("upgradeCta")}
      </Button>
      <UpgradeModal open={open} onClose={() => setOpen(false)} reason="ai" />
    </div>
  );
}
