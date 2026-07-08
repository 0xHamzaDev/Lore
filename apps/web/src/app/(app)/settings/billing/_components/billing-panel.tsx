"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lore/ui";
import { toast } from "sonner";
import { startCheckoutAction, cancelSubscriptionAction } from "../_actions";

interface Props {
  orgId: string;
  state: "free" | "active" | "cancelled" | "past_due";
}

export function BillingPanel({ orgId, state }: Props) {
  const t = useTranslations("Billing");
  const router = useRouter();
  const [isUpgrading, startUpgrade] = useTransition();
  const [isCancelling, startCancel] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleUpgrade() {
    startUpgrade(async () => {
      const result = await startCheckoutAction({ orgId });
      if (!result.success) {
        toast.error(t("errors.startCheckout"));
        return;
      }
      router.push(result.data.checkoutUrl);
    });
  }

  function handleCancel() {
    startCancel(async () => {
      const result = await cancelSubscriptionAction({ orgId });
      if (!result.success) {
        toast.error(t("errors.cancel"));
        return;
      }
      toast.success(t("toasts.cancelled"));
      setConfirmOpen(false);
      router.refresh();
    });
  }

  if (state === "free" || state === "past_due") {
    return (
      <Button
        onClick={handleUpgrade}
        disabled={isUpgrading}
        className="self-start"
      >
        {isUpgrading ? t("ctas.upgrading") : t("ctas.upgrade")}
      </Button>
    );
  }

  if (state === "active") {
    return (
      <>
        <Button
          variant="outline"
          onClick={() => setConfirmOpen(true)}
          className="self-start"
        >
          {t("ctas.cancel")}
        </Button>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("cancelDialog.title")}</DialogTitle>
              <DialogDescription>
                {t("cancelDialog.description")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                disabled={isCancelling}
              >
                {t("cancelDialog.dismiss")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={isCancelling}
              >
                {isCancelling
                  ? t("ctas.cancelling")
                  : t("cancelDialog.confirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // state === "cancelled" — keep access; offer Reactivate (re-runs the same upgrade flow).
  return (
    <Button
      onClick={handleUpgrade}
      disabled={isUpgrading}
      className="self-start"
    >
      {isUpgrading ? t("ctas.upgrading") : t("ctas.reactivate")}
    </Button>
  );
}
