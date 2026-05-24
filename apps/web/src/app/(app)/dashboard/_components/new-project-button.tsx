"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@lore/ui";
import { QK } from "@lore/utils";
import { CreateProjectDialog } from "./create-project-dialog";
import { UpgradeModal } from "@/components/upgrade-modal";

interface NewProjectButtonProps {
  orgId: string;
  isPro: boolean;
  variant?: "default" | "outline";
  label?: string;
}

export function NewProjectButton({
  orgId,
  isPro,
  variant = "default",
  label,
}: NewProjectButtonProps) {
  const t = useTranslations("Dashboard");
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  return (
    <>
      <Button type="button" variant={variant} onClick={() => setCreateOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        {label ?? t("newProject")}
      </Button>

      <CreateProjectDialog
        orgId={orgId}
        isPro={isPro}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          setCreateOpen(false);
          queryClient.invalidateQueries({ queryKey: QK.projects.list(orgId) });
        }}
        onUpgradeRequired={() => setUpgradeOpen(true)}
      />

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  );
}
