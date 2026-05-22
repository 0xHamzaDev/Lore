"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";
import { QK } from "@lore/utils";
import { Button, Skeleton } from "@lore/ui";
import type { Project } from "@lore/db";
import { listProjects, deleteProject } from "../_actions";
import { ProjectCard } from "./project-card";
import { RenameProjectDialog } from "./rename-project-dialog";

interface ProjectGridProps {
  orgId: string;
}

export function ProjectGrid({ orgId }: ProjectGridProps) {
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

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-sm" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm text-[#93939f]">{t("Common.error")}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {t("Common.retry")}
        </Button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eeece7]">
          <BookOpen className="h-8 w-8 text-[#93939f]" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-[#17171c]">{t("Dashboard.emptyTitle")}</h2>
          <p className="text-sm text-[#93939f]">{t("Dashboard.emptyDescription")}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onRename={setRenameTarget}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {renameTarget && (
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
      )}
    </>
  );
}
