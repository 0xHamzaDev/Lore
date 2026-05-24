"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { QK } from "@lore/utils";
import { EmptyState, ErrorState, Button, Skeleton } from "@lore/ui";
import type { Project } from "@lore/db";
import { listProjects, deleteProject } from "../_actions";
import { ProjectCard } from "./project-card";
import { RenameProjectDialog } from "./rename-project-dialog";
import { NewProjectButton } from "./new-project-button";

interface ProjectGridProps {
  orgId: string;
  isPro: boolean;
}

function ProjectGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-sm" />
      ))}
    </div>
  );
}

export function ProjectGrid({ orgId, isPro }: ProjectGridProps) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [renameTarget, setRenameTarget] = useState<Project | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: QK.projects.list(orgId),
    queryFn: async () => {
      const result = await listProjects(orgId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });

  async function handleDelete(project: Project) {
    const result = await deleteProject({ projectId: project.id, orgId });
    if (!result.success) {
      toast.error(t("Common.error"));
      return;
    }
    queryClient.invalidateQueries({ queryKey: QK.projects.list(orgId) });
  }

  if (isLoading) return <ProjectGridSkeleton />;

  if (isError) {
    return (
      <ErrorState
        title={t("Dashboard.loadFailed")}
        description={t("Dashboard.loadFailedDescription")}
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t("Common.retry")}
          </Button>
        }
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={FolderPlus}
        title={t("Dashboard.emptyTitle")}
        description={t("Dashboard.emptyDescription")}
        action={<NewProjectButton orgId={orgId} isPro={isPro} />}
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onRename={setRenameTarget}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {renameTarget ? (
        <RenameProjectDialog
          project={renameTarget}
          orgId={orgId}
          open={!!renameTarget}
          onClose={() => setRenameTarget(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: QK.projects.list(orgId) });
            setRenameTarget(null);
          }}
        />
      ) : null}
    </>
  );
}
