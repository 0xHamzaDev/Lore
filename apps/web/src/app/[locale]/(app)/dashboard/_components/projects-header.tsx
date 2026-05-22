"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@lore/ui";
import { QK } from "@lore/utils";
import { CreateProjectDialog } from "./create-project-dialog";
import { UpgradeModal } from "./upgrade-modal";

interface ProjectsHeaderProps {
  orgId: string;
}

export function ProjectsHeader({ orgId }: ProjectsHeaderProps) {
  const t = useTranslations("Dashboard");
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setCreateOpen(true)}>
        <Plus className="me-1.5 h-4 w-4" />
        {t("newProject")}
      </Button>

      <CreateProjectDialog
        orgId={orgId}
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
