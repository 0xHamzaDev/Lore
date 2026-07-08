"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@lore/utils";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lore/ui";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  /** Tailors the copy to why the gate fired. Defaults to the project-limit reason. */
  reason?: "project" | "ai";
}

export function UpgradeModal({
  open,
  onClose,
  reason = "project",
}: UpgradeModalProps) {
  const t = useTranslations("Upgrade");
  const tCommon = useTranslations("Common");

  const descriptionKey = reason === "ai" ? "aiDescription" : "description";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t(descriptionKey)}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
          <Button asChild>
            <Link href={ROUTES.settings.billing}>{t("cta")}</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
